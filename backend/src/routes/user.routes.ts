import { Router } from 'express';
import { getMe } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

/** Mounted at /api. */
export const userRouter = Router();

userRouter.get('/me', requireAuth, getMe);
