import { Request, Response, NextFunction } from 'express';
import * as MessageService from '../services/message.service';
import * as StorageService from '../services/storage.service';
import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../socket';

/** GET /api/channels/:channelId/messages */
export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const before = req.query.before as string | undefined;

    const result = await MessageService.getMessages(
      req.params.channelId,
      req.user.userId,
      { limit, before }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:channelId/messages */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const { content, message_type, parent_id, poll_data } = req.body;
    const message = await MessageService.sendMessage(
      req.params.channelId,
      req.user.userId,
      content,
      message_type,
      parent_id,
      poll_data
    );

    /* Process file attachments if any */
    if (req.files && Array.isArray(req.files)) {
      const attachments = [];
      for (const file of req.files) {
        const attachment = await StorageService.processUpload(file, message.id);
        attachments.push(attachment);
      }
      message.attachments = attachments;
    }

    const io = getSocketServer();
    io?.to(`channel:${req.params.channelId}`).emit('new_message', message);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/:id */
export async function editMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const message = await MessageService.editMessage(
      req.params.id,
      req.user.userId,
      req.body.content
    );

    res.json(message);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages/:id */
export async function deleteMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    await MessageService.deleteMessage(req.params.id, req.user.userId);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/:id/thread */
export async function getThread(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const before = req.query.before as string | undefined;

    const result = await MessageService.getThreadMessages(
      req.params.id,
      req.user.userId,
      { limit, before }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages/:id/reactions */
export async function addReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const reaction = await MessageService.addReaction(
      req.params.id,
      req.user.userId,
      req.body.emoji
    );

    res.status(201).json(reaction);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages/:id/reactions/:emoji */
export async function removeReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    await MessageService.removeReaction(
      req.params.id,
      req.user.userId,
      req.params.emoji
    );

    res.json({ message: 'Reaction removed' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/:channelId/messages/search?q=... */
export async function searchMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');

    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }

    const messages = await MessageService.searchMessages(
      req.params.channelId,
      req.user.userId,
      query
    );

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages/:id/pin */
export async function pinMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const message = await MessageService.pinMessage(req.params.id, req.user.userId);
    const io = getSocketServer();
    io?.to(`channel:${message.channel_id}`).emit('message_edited', message);
    res.json(message);
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages/:id/unpin */
export async function unpinMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const message = await MessageService.unpinMessage(req.params.id, req.user.userId);
    const io = getSocketServer();
    io?.to(`channel:${message.channel_id}`).emit('message_edited', message);
    res.json(message);
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/:channelId/messages/pinned */
export async function getPinnedMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const messages = await MessageService.getPinnedMessages(req.params.channelId, req.user.userId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages/:id/poll-vote */
export async function votePoll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const optionId = req.body.optionId as string;
    const message = await MessageService.votePoll(req.params.id, req.user.userId, optionId);
    const io = getSocketServer();
    io?.to(`channel:${message.channel_id}`).emit('message_edited', message);
    res.json(message);
  } catch (err) {
    next(err);
  }
}
