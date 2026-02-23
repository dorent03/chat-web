import { Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import type { TokenPayload } from '../../types';

/** Extend Socket to carry authenticated user data */
declare module 'socket.io' {
  interface Socket {
    user?: TokenPayload;
  }
}

/**
 * Socket.io middleware that verifies the JWT access token.
 * Expects token in auth.token or as a query parameter.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token;

  if (!token || typeof token !== 'string') {
    logger.warn(`Socket auth failed: no token (id=${socket.id})`);
    next(new Error('Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.user = payload;
    next();
  } catch {
    logger.warn(`Socket auth failed: invalid token (id=${socket.id})`);
    next(new Error('Invalid or expired token'));
  }
}
