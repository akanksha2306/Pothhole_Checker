import { Router } from 'express';
import { GoogleAuthRequestSchema } from 'shared';
import { googleAuth, logout } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.post('/google', validate({ body: GoogleAuthRequestSchema }), googleAuth);
authRouter.post('/logout', logout);
