/** Reads users, returning the public (no googleId) contract shape. */
import type { PrismaClient } from '@prisma/client';
import type { User } from 'shared';
import { UnauthorizedError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { toPublicUser } from '../lib/serialize.js';

export class UserService {
  constructor(private readonly db: PrismaClient) {}

  /** Current user, fresh from the DB. 401 when the session no longer resolves. */
  async getPublicUser(id: string): Promise<User> {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) {
      throw new UnauthorizedError('Session user no longer exists');
    }
    return toPublicUser(user);
  }
}

/** Request-scoped singleton wired once at module load. */
export const userService = new UserService(prisma);
