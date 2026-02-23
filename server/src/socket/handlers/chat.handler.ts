import { Server, Socket } from 'socket.io';
import * as MessageService from '../../services/message.service';
import * as MessageModel from '../../models/message.model';
import * as MembershipModel from '../../models/membership.model';
import { logger } from '../../utils/logger';

interface SendMessagePayload {
  channelId: string;
  content: string;
  messageType?: string;
  parentId?: string | null;
}

interface EditMessagePayload {
  messageId: string;
  content: string;
}

interface DeleteMessagePayload {
  messageId: string;
}

interface ReactionPayload {
  messageId: string;
  emoji: string;
}

/** Register chat-related socket event handlers */
export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.user!.userId;

  socket.on('send_message', async (payload: SendMessagePayload) => {
    try {
      const message = await MessageService.sendMessage(
        payload.channelId,
        userId,
        payload.content,
        payload.messageType || 'text',
        payload.parentId
      );

      io.to(`channel:${payload.channelId}`).emit('new_message', message);
    } catch (err) {
      logger.error('Socket send_message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('edit_message', async (payload: EditMessagePayload) => {
    try {
      const message = await MessageService.editMessage(
        payload.messageId,
        userId,
        payload.content
      );

      io.to(`channel:${message.channel_id}`).emit('message_edited', message);
    } catch (err) {
      logger.error('Socket edit_message error:', err);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  socket.on('delete_message', async (payload: DeleteMessagePayload) => {
    try {
      const msg = await MessageModel.findById(payload.messageId);
      if (!msg) return;

      const channelId = msg.channel_id.toString();
      await MessageService.deleteMessage(payload.messageId, userId);

      io.to(`channel:${channelId}`).emit('message_deleted', {
        messageId: payload.messageId,
        channelId,
      });
    } catch (err) {
      logger.error('Socket delete_message error:', err);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  socket.on('add_reaction', async (payload: ReactionPayload) => {
    try {
      const reaction = await MessageService.addReaction(
        payload.messageId,
        userId,
        payload.emoji
      );

      const msg = await MessageModel.findById(payload.messageId);
      if (msg) {
        io.to(`channel:${msg.channel_id}`).emit('reaction_added', {
          ...reaction,
          username: socket.user!.username,
        });
      }
    } catch (err) {
      logger.error('Socket add_reaction error:', err);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  socket.on('remove_reaction', async (payload: ReactionPayload) => {
    try {
      await MessageService.removeReaction(payload.messageId, userId, payload.emoji);

      const msg = await MessageModel.findById(payload.messageId);
      if (msg) {
        io.to(`channel:${msg.channel_id}`).emit('reaction_removed', {
          messageId: payload.messageId,
          userId,
          emoji: payload.emoji,
        });
      }
    } catch (err) {
      logger.error('Socket remove_reaction error:', err);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });

  socket.on('join_channel', async (channelId: string) => {
    try {
      const member = await MembershipModel.isMember(userId, channelId);
      if (!member) {
        socket.emit('error', { message: 'Not a member of this channel' });
        return;
      }
      socket.join(`channel:${channelId}`);
      logger.debug(`User ${userId} joined channel room: ${channelId}`);
    } catch (err) {
      logger.error('Socket join_channel error:', err);
    }
  });

  socket.on('leave_channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
    logger.debug(`User ${userId} left channel room: ${channelId}`);
  });
}
