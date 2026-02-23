import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; /* 7 days */

/** POST /api/auth/register */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, tokens } = await AuthService.register(req.body);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    res.status(201).json({
      user,
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, tokens } = await AuthService.login(req.body);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    res.json({
      user,
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(
  _req: Request,
  res: Response
): Promise<void> {
  res.clearCookie(REFRESH_COOKIE_NAME);
  res.json({ message: 'Logged out' });
}

/** POST /api/auth/refresh */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const tokens = await AuthService.refreshTokens(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}
