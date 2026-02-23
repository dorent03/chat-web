import * as UserModel from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';
import type { SafeUser } from '../types';

/** Get a user by ID (safe, no password) */
export async function getUserById(id: string): Promise<SafeUser> {
  const user = await UserModel.findByIdSafe(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

/** Update user profile (username, email, avatar) */
export async function updateProfile(
  userId: string,
  data: { username?: string; email?: string; avatar_url?: string }
): Promise<SafeUser> {
  if (data.username) {
    const existing = await UserModel.findByUsername(data.username);
    if (existing && existing.id !== userId) {
      throw new AppError(409, 'Username already taken');
    }
  }

  if (data.email) {
    const existing = await UserModel.findByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new AppError(409, 'Email already registered');
    }
  }

  const user = await UserModel.updateById(userId, data);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

/** Change user password (requires current password verification) */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const valid = await comparePassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const password_hash = await hashPassword(newPassword);
  await UserModel.updateById(userId, { password_hash });
}

/** Search users by username */
export async function searchUsers(query: string): Promise<SafeUser[]> {
  return UserModel.searchByUsername(query);
}
