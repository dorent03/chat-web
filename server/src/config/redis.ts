import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisAvailable = false;

/** In-memory fallback set for online users when Redis is unavailable */
const inMemoryOnlineSet = new Set<string>();

function createClient(label: string): Redis {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    retryStrategy(times: number) {
      if (times > 3) {
        logger.warn(`Redis (${label}): giving up after ${times} retries`);
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('connect', () => {
    logger.info(`Redis (${label}) connected`);
  });

  client.on('error', (err: Error) => {
    if (err.message.includes('ECONNREFUSED')) {
      logger.warn(`Redis (${label}) unavailable - running without Redis`);
    } else {
      logger.error(`Redis (${label}) error:`, err);
    }
  });

  return client;
}

/** Attempt to connect the primary Redis client. Non-blocking - app works without Redis. */
export async function initRedis(): Promise<void> {
  const client = createClient('primary');
  try {
    await client.connect();
    redisClient = client;
    redisAvailable = true;
    logger.info('Redis is available');
  } catch {
    logger.warn('Redis is not available - using in-memory fallback for online status');
    redisAvailable = false;
    client.disconnect();
  }
}

/** Check if Redis is connected and usable */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null && redisClient.status === 'ready';
}

/** Create a new Redis client for the Socket.io adapter. Returns null if Redis is unavailable. */
export function createRedisAdapterClients(): { pub: Redis; sub: Redis } | null {
  if (!isRedisAvailable()) return null;

  const pub = createClient('socket-pub');
  const sub = createClient('socket-sub');

  try {
    pub.connect();
    sub.connect();
    return { pub, sub };
  } catch {
    logger.warn('Failed to create Redis adapter clients');
    pub.disconnect();
    sub.disconnect();
    return null;
  }
}

/* ── Online-status helpers (Redis or in-memory) ── */

/** Add a user ID to the online set */
export async function addOnlineUser(userId: string): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try {
      await redisClient.sadd('online_users', userId);
      return;
    } catch {
      /* fall through to in-memory */
    }
  }
  inMemoryOnlineSet.add(userId);
}

/** Remove a user ID from the online set */
export async function removeOnlineUser(userId: string): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try {
      await redisClient.srem('online_users', userId);
      return;
    } catch {
      /* fall through to in-memory */
    }
  }
  inMemoryOnlineSet.delete(userId);
}

/** Get all online user IDs */
export async function getOnlineUserIds(): Promise<string[]> {
  if (isRedisAvailable() && redisClient) {
    try {
      return await redisClient.smembers('online_users');
    } catch {
      /* fall through to in-memory */
    }
  }
  return Array.from(inMemoryOnlineSet);
}
