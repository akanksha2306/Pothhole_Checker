import type { RequestHandler } from 'express';
import type { GoogleAuthRequest, OkResponse } from 'shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  sessionCookieOptions,
  signSessionToken,
} from '../lib/jwt.js';
import { toPublicUser } from '../lib/serialize.js';
import { validated } from '../middleware/validate.js';
import { authService } from '../services/auth.service.js';

/** POST /api/auth/google — verify the GIS ID token, set the session cookie. */
export const googleAuth: RequestHandler = asyncHandler(async (req, res) => {
  const { credential } = validated<GoogleAuthRequest>(req, 'body');
  const user = await authService.loginWithGoogleCredential(credential);

  const token = signSessionToken({ sub: user.id, email: user.email, role: user.role });
  res
    .cookie(SESSION_COOKIE, token, sessionCookieOptions())
    .status(200)
    .json(toPublicUser(user));
});

/** POST /api/auth/logout — clear the session cookie. */
export const logout: RequestHandler = asyncHandler(async (_req, res) => {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
  const body: OkResponse = { ok: true };
  res.status(200).json(body);
});
