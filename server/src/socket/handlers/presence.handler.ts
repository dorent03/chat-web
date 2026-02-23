import { Server, Socket } from 'socket.io';
import { addOnlineUser, removeOnlineUser, getOnlineUserIds } from '../../config/redis';
import * as UserModel from '../../models/user.model';
import * as MembershipModel from '../../models/membership.model';
import { logger } from '../../utils/logger';

interface ReadReceiptPayload {
  channelId: string;
  messageId: string;
}

/** Register presence (online/offline) and read receipt handlers */
export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const userId = socket.user!.userId;

  /* Mark user as online on connect */
  handleConnect(io, socket).catch((err) => {
    logger.error('Presence connect error:', err);
  });

  socket.on('read_receipt', async (payload: ReadReceiptPayload) => {
    try {
      await MembershipModel.updateLastRead(
        userId,
        payload.channelId,
        new Date().toISOString()
      );

      socket.to(`channel:${payload.channelId}`).emit('read_receipt', {
        channelId: payload.channelId,
        userId,
        messageId: payload.messageId,
      });
    } catch (err) {
      logger.error('Socket read_receipt error:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      /* Check if user has any other active sockets */
      const sockets = await io.fetchSockets();
      const stillConnected = sockets.some(
        (s) => s.id !== socket.id && (s as unknown as Socket).user?.userId === userId
      );

      if (!stillConnected) {
        await removeOnlineUser(userId);
        await UserModel.updateStatus(userId, 'offline');

        io.emit('user_offline', { userId, status: 'offline' });
        logger.info(`User ${userId} went offline`);
      }
    } catch (err) {
      logger.error('Presence disconnect error:', err);
    }
  });
}

async function handleConnect(io: Server, socket: Socket): Promise<void> {
  const userId = socket.user!.userId;

  await addOnlineUser(userId);
  await UserModel.updateStatus(userId, 'online');

  io.emit('user_online', { userId, status: 'online' });
  logger.info(`User ${userId} came online`);

  /* Send the list of currently online users to the connecting client */
  const onlineUserIds = await getOnlineUserIds();
  socket.emit('online_users', onlineUserIds);
}

/** Get all online user IDs (utility for other services) */
export async function getOnlineUsers(): Promise<string[]> {
  return getOnlineUserIds();
}
