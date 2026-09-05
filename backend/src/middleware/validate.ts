/**
 * Zod validation middleware — the only place raw request data is trusted.
 *
 * Usage:
 *   router.get('/', requireAuth, validate({ query: ListReportsQuerySchema }), listReports);
 *
 * Parsed values are stored on `req.validated` (see `validated()` below) rather
 * than written back onto `req.query`/`req.body`: `req.query` is a getter-only
 * accessor in Express 5, and narrowing `RequestHandler`'s query generic breaks
 * handler assignability at route registration.
 */
import type { Request, RequestHandler } from 'express';
import type { ZodError, ZodType, ZodTypeDef } from 'zod';
import { BadRequestError } from '../lib/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Attached by `validate()`; read it back with the `validated()` helper. */
    validated?: Partial<Record<ValidatedSource, unknown>>;
  }
}

export type ValidatedSource = 'params' | 'query' | 'body';

/**
 * `Input = unknown` keeps schemas with coercion/defaults (e.g.
 * `z.coerce.number().default(50)`) assignable: we only constrain the *output*
 * type the controller receives.
 */
interface RequestSchemas<Body, Query, Params> {
  body?: ZodType<Body, ZodTypeDef, unknown>;
  query?: ZodType<Query, ZodTypeDef, unknown>;
  params?: ZodType<Params, ZodTypeDef, unknown>;
}

/** Normalises Zod issues into `{ field: [messages] }`, with a `_root` fallback. */
function formatIssues(error: ZodError): Record<string, string[]> {
  const flattened = error.flatten().fieldErrors;
  const issues: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(flattened)) {
    if (messages && messages.length > 0) {
      issues[field.length > 0 ? field : '_root'] = messages;
    }
  }
  return issues;
}

export function validate(schemas: {
  body?: ZodType<unknown, ZodTypeDef, unknown>;
  query?: ZodType<unknown, ZodTypeDef, unknown>;
  params?: ZodType<unknown, ZodTypeDef, unknown>;
}): RequestHandler {
  return (req, _res, next) => {
    const validated: Partial<Record<ValidatedSource, unknown>> = {};
    const failures: Record<string, Record<string, string[]>> = {};

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        validated.params = result.data;
      } else {
        failures.params = formatIssues(result.error);
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        validated.query = result.data;
      } else {
        failures.query = formatIssues(result.error);
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        validated.body = result.data;
      } else {
        failures.body = formatIssues(result.error);
      }
    }

    if (Object.keys(failures).length > 0) {
      next(new BadRequestError('Validation failed', failures));
      return;
    }

    req.validated = validated;
    next();
  };
}

/**
 * Reads parsed, schema-validated data. The single deliberate assertion in the
 * codebase: Zod has already checked the shape, this only restores the type.
 * Throws (500) if the route forgot the matching `validate()` middleware.
 */
export function validated<T>(req: Request, source: ValidatedSource): T {
  const value = req.validated?.[source];
  if (value === undefined) {
    throw new Error(`Route is missing validate({ ${source}: ... }) — no validated ${source} on the request`);
  }
  return value as T;
}
