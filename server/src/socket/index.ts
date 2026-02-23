import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisAdapterClients } from '../config/redis';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerTypingHandlers } from './handlers/typing.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { logger } from '../utils/logger';

let ioInstance: Server | null = null;

/** Returns the active Socket.io server instance, if initialized. */
export function getSocketServer(): Server | null {
  return ioInstance;
}

/** Initialize Socket.io server with optional Redis adapter and all event handlers */
export function initializeSocket(httpServer: HttpServer): Server {
  const corsOrigins = env.NODE_ENV === 'development'
    ? ['http://127.0.0.1:5173', 'http://localhost:5173']
    : env.CORS_ORIGIN;
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* Attempt Redis adapter for horizontal scaling; fall back to in-memory adapter */
  const adapterClients = createRedisAdapterClients();
  if (adapterClients) {
    io.adapter(createAdapter(adapterClients.pub, adapterClients.sub));
    logger.info('Socket.io using Redis adapter');
  } else {
    logger.info('Socket.io using default in-memory adapter');
  }

  /* Auth middleware */
  io.use(socketAuthMiddleware);

  /* Connection handler */
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.userId})`);
    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }

    registerChatHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('error', (err) => {
      logger.error(`Socket error (${socket.id}):`, err);
    });
  });

  ioInstance = io;
  return io;
}
