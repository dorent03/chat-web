import { Server, Socket } from 'socket.io';

const TYPING_TIMEOUT_MS = 3000;
const activeTypers = new Map<string, NodeJS.Timeout>();

interface TypingPayload {
  channelId: string;
}

/** Register typing indicator event handlers */
export function registerTypingHandlers(io: Server, socket: Socket): void {
  const userId = socket.user!.userId;
  const username = socket.user!.username;

  socket.on('typing_start', (payload: TypingPayload) => {
    const key = `${userId}:${payload.channelId}`;

    /* Clear existing auto-stop timer */
    const existing = activeTypers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    /* Broadcast typing to other members in the channel */
    socket.to(`channel:${payload.channelId}`).emit('typing_start', {
      channelId: payload.channelId,
      userId,
      username,
    });

    /* Auto-stop typing after timeout */
    const timer = setTimeout(() => {
      socket.to(`channel:${payload.channelId}`).emit('typing_stop', {
        channelId: payload.channelId,
        userId,
        username,
      });
      activeTypers.delete(key);
    }, TYPING_TIMEOUT_MS);

    activeTypers.set(key, timer);
  });

  socket.on('typing_stop', (payload: TypingPayload) => {
    const key = `${userId}:${payload.channelId}`;

    const existing = activeTypers.get(key);
    if (existing) {
      clearTimeout(existing);
      activeTypers.delete(key);
    }

    socket.to(`channel:${payload.channelId}`).emit('typing_stop', {
      channelId: payload.channelId,
      userId,
      username,
    });
  });

  /* Clean up typing timers on disconnect */
  socket.on('disconnect', () => {
    for (const [key, timer] of activeTypers.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timer);
        activeTypers.delete(key);
      }
    }
  });
}
