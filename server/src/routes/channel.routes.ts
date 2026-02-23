import { Router } from 'express';
import { z } from 'zod';
import * as ChannelController from '../controllers/channel.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(100),
  type: z.enum(['public', 'private', 'direct']).default('public'),
  description: z.string().max(500).optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private']).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

router.post('/', authenticate, validate(createChannelSchema), ChannelController.createChannel);
router.get('/', authenticate, ChannelController.getMyChannels);
router.get('/public', authenticate, ChannelController.getPublicChannels);
router.get('/:id', authenticate, ChannelController.getChannel);
router.patch('/:id', authenticate, validate(updateChannelSchema), ChannelController.updateChannel);
router.delete('/:id', authenticate, ChannelController.deleteChannel);
router.post('/:id/join', authenticate, ChannelController.joinChannel);
router.post('/:id/leave', authenticate, ChannelController.leaveChannel);
router.get('/:id/members', authenticate, ChannelController.getMembers);
router.post('/:id/members', authenticate, validate(addMemberSchema), ChannelController.addMember);
router.post('/:id/kick/:userId', authenticate, ChannelController.kickMember);

export default router;
