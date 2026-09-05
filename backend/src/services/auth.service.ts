/**
 * Google sign-in + admin provisioning.
 *
 * Sign-in is Google-only: we verify the GIS ID token, upsert the User by
 * googleId, and (re)derive the role from the ADMIN_EMAILS allowlist on every
 * login — the allowlist is the single source of truth, so removing an email
 * demotes that account at its next login.
 */
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { PrismaClient, User as PrismaUser } from '@prisma/client';
import type { Role } from 'shared';
import { env, roleForEmail } from '../lib/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

/** Verified claims we need from the Google ID token. */
interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** Strips anything JWT-shaped before an error string reaches the logs. */
function redactTokens(value: string): string {
  return value.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<redacted>');
}

export class AuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly db: PrismaClient,
    googleClientId: string = env.GOOGLE_CLIENT_ID,
  ) {
    this.oauthClient = new OAuth2Client(googleClientId);
  }

  /**
   * Verifies the credential, applies the allowlist, and upserts the user.
   * Returns the DB user; the caller turns it into a session.
   */
  async loginWithGoogleCredential(credential: string): Promise<PrismaUser> {
    const googleUser = await this.verifyGoogleCredential(credential);
    const role: Role = roleForEmail(googleUser.email);

    return this.db.user.upsert({
      where: { googleId: googleUser.sub },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        role,
      },
      create: {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        role,
      },
    });
  }

  private async verifyGoogleCredential(credential: string): Promise<VerifiedGoogleUser> {
    let claims: TokenPayload | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      claims = ticket.getPayload();
    } catch (error) {
      console.warn(
        '[auth] Google credential rejected:',
        error instanceof Error ? redactTokens(error.message) : 'unknown error',
      );
      throw new UnauthorizedError('Invalid Google credential');
    }

    if (!claims?.sub || !claims.email || claims.email_verified !== true) {
      throw new UnauthorizedError('Google credential did not contain a verified email');
    }

    return {
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? claims.email,
      avatarUrl: claims.picture ?? null,
    };
  }
}

/** Request-scoped singletons wired once at module load. */
export const authService = new AuthService(prisma);
