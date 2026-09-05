/**
 * Single, centralized error handler. Every error reaching Express — thrown
 * synchronously, rejected from an async handler, or passed to `next(err)` — is
 * mapped here to the shared error envelope:
 *   { error: { message, code, details? } }
 */
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiError, ApiErrorCode } from 'shared';
import { AppError } from '../lib/errors.js';
import { isProduction } from '../lib/env.js';

function sendError(res: Response, status: number, body: ApiError): void {
  res.status(status).json(body);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Zod errors thrown outside the validate middleware (defensive programming).
  if (err instanceof ZodError) {
    sendError(res, 400, {
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: err.flatten().fieldErrors },
    });
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.status, {
      error: { message: err.message, code: err.code, ...(err.details !== undefined ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation.
    if (err.code === 'P2002') {
      sendError(res, 409, { error: { message: 'Resource already exists', code: 'CONFLICT' } });
      return;
    }
    // Record not found / required relation missing.
    if (err.code === 'P2025') {
      sendError(res, 404, { error: { message: 'Resource not found', code: 'NOT_FOUND' } });
      return;
    }
    // Foreign key constraint violation.
    if (err.code === 'P2003') {
      sendError(res, 400, { error: { message: 'Related resource does not exist', code: 'VALIDATION_ERROR' } });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    sendError(res, 503, { error: { message: 'Database unavailable', code: 'SERVICE_UNAVAILABLE' } });
    return;
  }

  const code: ApiErrorCode = 'INTERNAL';
  // Log the full error server-side only; never leak internals to the client.
  console.error('[unhandled error]', err);
  sendError(res, 500, {
    error: {
      message: isProduction ? 'Internal server error' : `Internal server error: ${String(err instanceof Error ? err.message : err)}`,
      code,
    },
  });
}
