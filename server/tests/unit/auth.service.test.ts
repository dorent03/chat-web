import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, comparePassword } from '../../src/utils/hash';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt';

/* Mock env before importing services */
vi.mock('../../src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-at-least-16-chars',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-16-chars',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  },
}));

describe('Hash Utilities', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('test-password');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('test-password');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify a correct password', async () => {
    const hash = await hashPassword('test-password');
    const match = await comparePassword('test-password', hash);
    expect(match).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('test-password');
    const match = await comparePassword('wrong-password', hash);
    expect(match).toBe(false);
  });
});

describe('JWT Utilities', () => {
  const testPayload = { userId: 'user-123', username: 'testuser' };

  it('should generate access and refresh tokens', () => {
    const tokens = generateTokens(testPayload);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
  });

  it('should verify a valid access token', () => {
    const tokens = generateTokens(testPayload);
    const decoded = verifyAccessToken(tokens.accessToken);
    expect(decoded.userId).toBe(testPayload.userId);
    expect(decoded.username).toBe(testPayload.username);
  });

  it('should verify a valid refresh token', () => {
    const tokens = generateTokens(testPayload);
    const decoded = verifyRefreshToken(tokens.refreshToken);
    expect(decoded.userId).toBe(testPayload.userId);
    expect(decoded.username).toBe(testPayload.username);
  });

  it('should reject an invalid access token', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow();
  });

  it('should reject an invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });

  it('should reject an access token verified with refresh secret', () => {
    const tokens = generateTokens(testPayload);
    /* Access token should not verify with refresh secret and vice versa */
    expect(() => verifyRefreshToken(tokens.accessToken)).toThrow();
  });
});

describe('Auth Service Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hash password with sufficient rounds', async () => {
    const hash = await hashPassword('my-secure-password');
    /* bcrypt with 12 rounds starts with $2b$12$ */
    expect(hash.startsWith('$2b$12$')).toBe(true);
  });

  it('should produce different hashes for the same password', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
    /* But both should verify correctly */
    expect(await comparePassword('same-password', hash1)).toBe(true);
    expect(await comparePassword('same-password', hash2)).toBe(true);
  });
});
