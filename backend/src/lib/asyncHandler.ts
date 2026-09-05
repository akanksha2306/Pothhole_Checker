import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Forwards a rejected promise to the central error handler instead of letting
 * it hang as an unhandled rejection. (Express 5 also forwards rejections, but
 * this keeps handlers honest and works on Express 4 idioms too.)
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
