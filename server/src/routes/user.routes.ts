import { Router } from 'express';
import { z } from 'zod';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8).max(128),
});

router.get('/search', authenticate, UserController.searchUsers);
router.get('/me', authenticate, UserController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), UserController.updateMe);
router.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  UserController.changePassword
);
router.get('/:id', authenticate, UserController.getUser);

export default router;
