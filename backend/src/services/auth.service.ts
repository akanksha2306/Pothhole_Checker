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
import type { LoginIntent, Role } from 'shared';
import { env, roleForEmail } from '../lib/env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
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

/**
 * Login-intent gate, enforced server-side (the UI's Citizen/Municipality choice
 * is never trusted). MUNICIPALITY intent requires an allowlisted municipal role;
 * a rejected login must not create any rows or issue a session.
 */
export function assertIntentAllowsRole(intent: LoginIntent, role: Role): void {
  if (intent === 'MUNICIPALITY' && role !== 'ADMIN' && role !== 'REPAIRER') {
    throw new ForbiddenError("This account doesn't have municipal access — sign in as a citizen instead");
  }
}

/** Result of a successful login: the DB user plus the role this session runs under. */
export interface LoginResult {
  user: PrismaUser;
  /** The role this session carries — the login door decides it, not the allowlist. */
  sessionRole: Role;
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
   *
   * The allowlist stays the source of truth for what an account *is* (stored on
   * the User row), but the login door decides what the session *runs as*: the
   * citizen door is the public entrance, so even an allowlisted admin entering
   * through it gets a CITIZEN session. MUNICIPALITY grants the real role.
   */
  async loginWithGoogleCredential(credential: string, intent: LoginIntent = 'CITIZEN'): Promise<LoginResult> {
    const googleUser = await this.verifyGoogleCredential(credential);
    const dbRole: Role = roleForEmail(googleUser.email);
    // Before any upsert: a rejected login must not create rows or a session.
    assertIntentAllowsRole(intent, dbRole);

    const user = await this.db.user.upsert({
      where: { googleId: googleUser.sub },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        role: dbRole,
      },
      create: {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        role: dbRole,
      },
    });

    const sessionRole: Role = intent === 'CITIZEN' ? 'CITIZEN' : dbRole;
    return { user, sessionRole };
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
