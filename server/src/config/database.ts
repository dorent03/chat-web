import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/** Connect to MongoDB using Mongoose */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

/** Disconnect from MongoDB */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
