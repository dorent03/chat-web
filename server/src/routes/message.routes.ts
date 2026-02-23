import { Router } from 'express';
import { z } from 'zod';
import * as MessageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';

const router = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000),
  message_type: z.enum(['text', 'image', 'file', 'poll']).default('text'),
  parent_id: z.string().min(1).optional().nullable(),
  poll_data: z
    .object({
      question: z.string().min(1).max(300),
      options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1).max(120), votes: z.array(z.string()).default([]) })).min(2).max(8),
      multiple: z.boolean().default(false),
    })
    .optional()
    .nullable(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(50),
});

const votePollSchema = z.object({
  optionId: z.string().min(1),
});

/* Channel message routes */
router.get(
  '/channels/:channelId/messages',
  authenticate,
  MessageController.getMessages
);

router.get(
  '/channels/:channelId/messages/search',
  authenticate,
  MessageController.searchMessages
);
router.get(
  '/channels/:channelId/messages/pinned',
  authenticate,
  MessageController.getPinnedMessages
);

router.post(
  '/channels/:channelId/messages',
  authenticate,
  upload.array('files', 5),
  validate(sendMessageSchema),
  MessageController.sendMessage
);

/* Individual message routes */
router.patch(
  '/messages/:id',
  authenticate,
  validate(editMessageSchema),
  MessageController.editMessage
);

router.delete(
  '/messages/:id',
  authenticate,
  MessageController.deleteMessage
);

router.get(
  '/messages/:id/thread',
  authenticate,
  MessageController.getThread
);

router.post(
  '/messages/:id/reactions',
  authenticate,
  validate(reactionSchema),
  MessageController.addReaction
);

router.delete(
  '/messages/:id/reactions/:emoji',
  authenticate,
  MessageController.removeReaction
);
router.post(
  '/messages/:id/pin',
  authenticate,
  MessageController.pinMessage
);
router.post(
  '/messages/:id/unpin',
  authenticate,
  MessageController.unpinMessage
);
router.post(
  '/messages/:id/poll-vote',
  authenticate,
  validate(votePollSchema),
  MessageController.votePoll
);

export default router;
