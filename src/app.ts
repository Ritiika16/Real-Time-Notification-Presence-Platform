import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { createLogger } from './infrastructure/logger/logger';
import { Env } from './infrastructure/config/env';
import { AuthService } from './application/services/auth.service';
import { createAuthRoutes } from './api/routes/auth.routes';
import { createUsersRoutes } from './api/routes/users.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './infrastructure/config/swagger';

const createApp = (env: Env): Express => {
  const logger = createLogger(env);
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      credentials: true,
    })
  );

  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );

  const authService = new AuthService(logger);
  const authRoutes = createAuthRoutes(authService, logger);
  const usersRoutes = createUsersRoutes();

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: _req.path,
      method: _req.method,
    });

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  });

  return app;
};

export { createApp };
