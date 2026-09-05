/**
 * Auth guards. `requireAuth` verifies the session cookie and attaches
 * `req.user`; `requireRole('ADMIN')` additionally enforces a role. Chain them
 * in that order: `router.patch('/:id/status', requireAuth, requireRole('ADMIN'), ...)`.
 */
import type { Request, RequestHandler } from 'express';
import type { Role } from 'shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from '../lib/jwt.js';

/** Reads a single cookie without relying on the loosely-typed cookie-parser API. */
function readCookie(req: Request, name: string): string | undefined {
  const cookies: unknown = req.cookies;
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** 401 UNAUTHORIZED when there is no valid session cookie. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    next(new UnauthorizedError('Session is invalid or expired'));
    return;
  }

  req.user = payload;
  next();
};

/** 403 FORBIDDEN when the session role does not match. Must run after requireAuth. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (user.role !== role) {
      next(new ForbiddenError(`${role} access required`));
      return;
    }
    next();
  };
}

/** Use inside handlers that sit behind `requireAuth` to get non-optional claims. */
export function requireUser(req: Request): SessionPayload {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user;
}
