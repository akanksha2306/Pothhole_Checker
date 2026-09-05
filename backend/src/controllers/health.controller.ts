import type { RequestHandler } from 'express';
import type { OkResponse } from 'shared';

/**
 * Liveness probe. Deliberately does not touch the database, so the API can
 * report it is up even while the DB (or R2) is not configured yet.
 */
export const getHealth: RequestHandler = (_req, res) => {
  const body: OkResponse = { ok: true };
  res.status(200).json(body);
};
