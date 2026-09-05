/**
 * Session JWT helpers.
 *
 * The app session is a stateless JWT stored in an httpOnly cookie (see
 * SESSION_COOKIE). Same secret/key set is used for sign + verify: HS256.
 */
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RoleEnum, type Role } from 'shared';
import { env, isProduction } from './env.js';

/** Cookie name holding the session JWT. */
export const SESSION_COOKIE = 'pw_session';

/** Session lifetime: 7 days. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Claims carried by the session token. */
export interface SessionPayload {
  /** User id. */
  sub: string;
  email: string;
  role: Role;
}

const sessionPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  role: RoleEnum,
});

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign({ ...payload }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL_SECONDS,
  });
}

/** Returns the verified claims, or null when the token is missing/invalid/expired. */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    return sessionPayloadSchema.parse(decoded);
  } catch {
    return null;
  }
}

/** Cookie options for the session cookie (httpOnly, SameSite=Lax, secure in prod). */
export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

/** Same attributes without `maxAge`, for clearing the cookie on logout. */
export function clearSessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
} {
  const { maxAge: _maxAge, ...rest } = sessionCookieOptions();
  return rest;
}
