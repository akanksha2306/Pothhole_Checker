/**
 * Central, validated environment configuration.
 *
 * Loaded and parsed exactly once, at import time, so the process fails fast on
 * a bad/missing config instead of deep inside a request handler. Business code
 * imports `env` — never `process.env` directly.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Resolve .env relative to this file (backend/.env) so it works whether the
// process is started from the repo root, the backend workspace, or dist/.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  /** Comma-separated admin allowlist; empty string means "no admins yet". */
  ADMIN_EMAILS: z.string().default(''),
  /** Comma-separated repairer allowlist (crew accounts that can execute repairs). */
  REPAIRER_EMAILS: z.string().default(''),

  /** Cloudflare R2 credentials. Optional at boot; required before photo uploads work. */
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Frontend base URL, used for OAuth redirects and links in responses. */
  CLIENT_URL: z.string().default('http://localhost:5173'),

  /** City prefix for pothole human codes (BLR-00001). */
  CITY_CODE: z
    .string()
    .regex(/^[A-Za-z]{2,6}$/, 'CITY_CODE must be 2-6 letters')
    .default('BLR')
    .transform((value) => value.toUpperCase()),
  /** Radius in metres for "is this report the same pothole?" nearby lookups. */
  NEARBY_RADIUS_M: z.coerce.number().int().positive().max(1000).default(20),
  /** Repair evidence must be captured within this distance of the pothole. */
  REPAIR_GPS_RADIUS_M: z.coerce.number().int().positive().max(1000).default(25),
  /** "Potholes within X" area radius in metres for the report flow. */
  AREA_RADIUS_M: z.coerce.number().int().positive().max(50_000).default(2000),
  /** Max potholes returned in the area list (total still reports the full count). */
  AREA_LIST_LIMIT: z.coerce.number().int().positive().max(100).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console -- fail fast before any logger exists
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration — check backend/.env');
}

export const env = parsed.data;

export const isProduction: boolean = env.NODE_ENV === 'production';

/** Lower-cased admin allowlist from ADMIN_EMAILS. */
export const adminEmails: readonly string[] = splitAllowlist(env.ADMIN_EMAILS);

/** Lower-cased repairer allowlist from REPAIRER_EMAILS. */
export const repairerEmails: readonly string[] = splitAllowlist(env.REPAIRER_EMAILS);

function splitAllowlist(raw: string): readonly string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.trim().toLowerCase());
}

export function isRepairerEmail(email: string): boolean {
  return repairerEmails.includes(email.trim().toLowerCase());
}

/**
 * Role derived from the allowlists at login. Admin wins if an email is on both
 * lists; the allowlists are the single source of truth, so roles are re-derived
 * (and can be revoked) on every login.
 */
export function roleForEmail(email: string): 'ADMIN' | 'REPAIRER' | 'CITIZEN' {
  if (isAdminEmail(email)) return 'ADMIN';
  if (isRepairerEmail(email)) return 'REPAIRER';
  return 'CITIZEN';
}

export function isR2Configured(): boolean {
  return (
    env.R2_ACCOUNT_ID.length > 0 &&
    env.R2_ACCESS_KEY_ID.length > 0 &&
    env.R2_SECRET_ACCESS_KEY.length > 0 &&
    env.R2_BUCKET.length > 0
  );
}

/** S3-compatible R2 endpoint for the configured account. */
export function r2Endpoint(): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
