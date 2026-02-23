import { Request, Response, NextFunction } from 'express';
import * as ChannelService from '../services/channel.service';
import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../socket';

/** POST /api/channels */
export async function createChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const channel = await ChannelService.createChannel(req.user.userId, req.body);

    if (channel.type === 'public') {
      const io = getSocketServer();
      io?.emit('channel_created', channel);
    }

    res.status(201).json(channel);
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels */
export async function getMyChannels(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const channels = await ChannelService.getUserChannels(req.user.userId);
    res.json(channels);
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/public */
export async function getPublicChannels(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const channels = await ChannelService.getPublicChannels();
    res.json(channels);
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/:id */
export async function getChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const channel = await ChannelService.getChannel(req.params.id, req.user.userId);
    res.json(channel);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/channels/:id */
export async function updateChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const channel = await ChannelService.updateChannel(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.json(channel);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/channels/:id */
export async function deleteChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    await ChannelService.deleteChannel(req.params.id, req.user.userId);
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/join */
export async function joinChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    await ChannelService.joinChannel(req.params.id, req.user.userId);
    res.json({ message: 'Joined channel' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/leave */
export async function leaveChannel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    await ChannelService.leaveChannel(req.params.id, req.user.userId);
    res.json({ message: 'Left channel' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/channels/:id/members */
export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const members = await ChannelService.getMembers(req.params.id, req.user.userId);
    res.json(members);
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/kick/:userId */
export async function kickMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    await ChannelService.kickMember(req.params.id, req.user.userId, req.params.userId);
    res.json({ message: 'Member kicked' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/channels/:id/members */
export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const targetUserId = req.body.userId as string;

    await ChannelService.addMember(req.params.id, req.user.userId, targetUserId);

    const io = getSocketServer();
    io?.to(`user:${targetUserId}`).emit('channel_invited', { channelId: req.params.id });

    res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
}
