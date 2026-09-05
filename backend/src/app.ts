import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins } from './lib/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { potholesRouter } from './routes/pothole.routes.js';
import { repairsRouter } from './routes/repair.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { userRouter } from './routes/user.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  // The Vite dev server calls the API with credentials (session cookie).
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', userRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/potholes', potholesRouter);
  app.use('/api/repairs', repairsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
