import dotenv from 'dotenv';
import { createApp } from './app';
import { validateEnv } from './infrastructure/config/env';
import { createLogger } from './infrastructure/logger/logger';
import { prisma } from './infrastructure/database/prisma';

dotenv.config();

const env = validateEnv();
const logger = createLogger(env);
const app = createApp(env);

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    void (async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Prisma client disconnected');
      process.exit(0);
    })();
  });

  const timeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  timeout.unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', {
    reason,
  });
  process.exit(1);
});
