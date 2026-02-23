import * as UserModel from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import type { AuthTokens } from '../types';

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

/** Register a new user, hash password, and return tokens */
export async function register(input: RegisterInput) {
  const existingEmail = await UserModel.findByEmail(input.email);
  if (existingEmail) {
    throw new AppError(409, 'Email already registered');
  }

  const existingUsername = await UserModel.findByUsername(input.username);
  if (existingUsername) {
    throw new AppError(409, 'Username already taken');
  }

  const password_hash = await hashPassword(input.password);
  const user = await UserModel.create({
    username: input.username,
    email: input.email,
    password_hash,
  });

  if (!user) {
    throw new AppError(500, 'Failed to create user');
  }

  const userId = (user._id || (user as Record<string, unknown>).id) as { toString(): string };

  const tokens = generateTokens({
    userId: userId.toString(),
    username: input.username,
  });

  return { user, tokens };
}

/** Authenticate a user by email/password and return tokens */
export async function login(input: LoginInput) {
  const user = await UserModel.findByEmail(input.email);
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await comparePassword(input.password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const safeUser = await UserModel.findByIdSafe(user._id.toString());
  if (!safeUser) {
    throw new AppError(500, 'Failed to retrieve user');
  }

  const tokens = generateTokens({
    userId: user._id.toString(),
    username: user.username,
  });

  return { user: safeUser, tokens };
}

/** Refresh tokens using a valid refresh token */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await UserModel.findByIdSafe(payload.userId);

    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    const userId = (user._id || (user as Record<string, unknown>).id) as { toString(): string };

    return generateTokens({
      userId: userId.toString(),
      username: (user as Record<string, unknown>).username as string,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Invalid refresh token');
  }
}
