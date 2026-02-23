import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initRedis } from './config/redis';
import { logger } from './utils/logger';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';
import { ensureUploadDir } from './services/storage.service';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';

async function bootstrap(): Promise<void> {
  /* Connect to MongoDB */
  await connectDatabase();

  /* Try to connect Redis (optional - app works without it) */
  await initRedis();

  const app = express();
  const server = http.createServer(app);

  /* Security headers */
  app.use(helmet());

  /* CORS: explicit manual headers to guarantee credentials support */
  const allowedOrigins = new Set(env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean));
  if (env.NODE_ENV === 'development') {
    allowedOrigins.add('http://127.0.0.1:5173');
    allowedOrigins.add('http://localhost:5173');
  }
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  /* Body parsing */
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  /* General rate limiting */
  app.use(generalLimiter);

  /* Static file serving for uploads */
  await ensureUploadDir();
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  /* REST API routes */
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api', messageRoutes);

  /* Health check */
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /* Global error handler */
  app.use(errorHandler);

  /* Initialize Socket.io */
  initializeSocket(server);

  /* Start server on 0.0.0.0 so both localhost and 127.0.0.1 work */
  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://127.0.0.1:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
