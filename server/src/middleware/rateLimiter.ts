import rateLimit from 'express-rate-limit';

const GENERAL_WINDOW_MS = 60_000;
const GENERAL_MAX_REQUESTS = 100;

const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_REQUESTS = 5;

/** General rate limiter: 100 requests per minute */
export const generalLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/** Strict rate limiter for auth endpoints: 5 requests per minute */
export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});
