import dotenv from 'dotenv';
import { createApp } from './app';
import { validateEnv } from './infrastructure/config/env';
import { createLogger } from './infrastructure/logger/logger';
import { prisma } from './infrastructure/database/prisma';
import { initializeSocketIO } from './realtime/socket';
import { NotificationService } from './application/services/notification.service';
import { TypingService } from './application/services/typing.service';
import { MetricsService } from './application/services/metrics.service';
import { NotificationRepository } from './infrastructure/repositories/notification.repository';
import { createRedisClient } from './infrastructure/redis/redis.client';
import { RedisPubSub } from './infrastructure/redis/redis.pubsub';

dotenv.config();

const env = validateEnv();
const logger = createLogger(env, env.PORT);

const notificationRepository = new NotificationRepository();

const redisPublisher = createRedisClient(env, logger, 'publisher');
const redisSubscriber = createRedisClient(env, logger, 'subscriber');
const redisPubSub = new RedisPubSub(redisPublisher, redisSubscriber, logger, env.INSTANCE_ID);

const notificationService = new NotificationService(
  notificationRepository,
  redisPubSub,
  env.INSTANCE_ID,
  logger
);

const typingService = new TypingService(redisPubSub, env.INSTANCE_ID, logger);
const metricsService = MetricsService.getInstance();

const app = createApp(env, notificationService);

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

initializeSocketIO(server, env, notificationService, typingService, metricsService, logger);

void (async () => {
  try {
    await redisPubSub.connect();
    await redisPubSub.subscribe({
      notification: (message) => {
        void notificationService.handleRedisNotification(message);
      },
      typing: (message) => {
        void typingService.handleRedisTyping(message);
      },
      readReceipt: (message) => {
        void notificationService.handleRedisReadReceipt(message);
      },
    });
  } catch (error) {
    logger.error('Failed to initialize Redis Pub/Sub', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
})();

const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    void (async () => {
      logger.info('HTTP server closed');
      await redisPubSub.disconnect();
      logger.info('Redis pub/sub disconnected');
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
