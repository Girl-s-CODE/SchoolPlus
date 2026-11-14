import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthTokenPayload, type UserRole } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

export function authMiddleware(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.get('authorization');
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearerToken ?? readCookie(request, 'token');

  if (!token) {
    response.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    request.user = verifyToken(token);
    next();
  } catch {
    response.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(request.user.role)) {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}

export function ownerOnly(ownerIdParam = 'studentId') {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({ message: 'Authentication required' });
      return;
    }
    const ownerId = request.params[ownerIdParam];
    if (!ownerId || request.user.id !== ownerId) {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}
