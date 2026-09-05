import type { RequestHandler } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireUser } from '../middleware/auth.js';
import { userService } from '../services/user.service.js';

/** GET /api/me — current user, fresh from the DB. */
export const getMe: RequestHandler = asyncHandler(async (req, res) => {
  const session = requireUser(req);
  const user = await userService.getPublicUser(session.sub);
  res.status(200).json(user);
});
