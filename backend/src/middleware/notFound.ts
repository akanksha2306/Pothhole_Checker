import type { Request, Response } from 'express';

/** 404 for unmatched API routes, in the same envelope as handled errors. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' },
  });
}
