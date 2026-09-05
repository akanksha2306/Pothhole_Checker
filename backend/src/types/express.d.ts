/**
 * Request augmentation: the authenticated session claims attached by the
 * `authenticate` middleware. Optional, because unauthenticated routes never set it.
 */
import type { SessionPayload } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

export {};
