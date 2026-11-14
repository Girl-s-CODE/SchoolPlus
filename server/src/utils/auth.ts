import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Response } from 'express';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface AuthTokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

export type SafeUser<T extends { passwordHash: unknown }> = Omit<T, 'passwordHash'>;

/** Remove credential material before returning a user record from an API handler. */
export function omitPasswordHash<T extends { passwordHash: unknown }>(user: T): SafeUser<T> {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

const TOKEN_COOKIE = 'token';
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured');
  return secret;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user: { id: string; role: UserRole }): string {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, jwtSecret());
  if (
    typeof payload === 'string' ||
    typeof payload.id !== 'string' ||
    !['STUDENT', 'TEACHER', 'ADMIN'].includes(String(payload.role))
  ) {
    throw new Error('Invalid authentication token');
  }
  return payload as AuthTokenPayload;
}

export function setAuthCookie(response: Response, token: string): void {
  response.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(response: Response): void {
  response.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
