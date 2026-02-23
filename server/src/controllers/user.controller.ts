import { Request, Response, NextFunction } from 'express';
import * as UserService from '../services/user.service';
import { AppError } from '../middleware/errorHandler';

/** GET /api/users/me */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const user = await UserService.getUserById(req.user.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/:id */
export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me */
export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const user = await UserService.updateProfile(req.user.userId, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me/password */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const { currentPassword, newPassword } = req.body;
    await UserService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: 'Password changed' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/search?q=... */
export async function searchUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }
    const users = await UserService.searchUsers(query);
    res.json(users);
  } catch (err) {
    next(err);
  }
}
