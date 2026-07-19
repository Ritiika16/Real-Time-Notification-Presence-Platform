import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Logger } from 'winston';
import { Env } from '../infrastructure/config/env';
import { PresenceManager } from './presence.manager';
import { socketAuthMiddleware } from './middlewares/socket.auth.middleware';
import { setupPresenceHandlers } from './handlers/presence.handler';
import { setupNotificationHandlers } from './handlers/notification.handler';
import { setupTypingHandlers } from './handlers/typing.handler';
import { NotificationService } from '../application/services/notification.service';
import { TypingService } from '../application/services/typing.service';
import { MetricsService } from '../application/services/metrics.service';

let io: SocketIOServer | null = null;
let presenceManager: PresenceManager | null = null;
let notificationService: NotificationService | null = null;
let typingService: TypingService | null = null;
let metricsService: MetricsService | null = null;

export const initializeSocketIO = (
  httpServer: HTTPServer,
  env: Env,
  notificationServiceInstance: NotificationService,
  typingServiceInstance: TypingService,
  metricsServiceInstance: MetricsService,
  logger: Logger
): SocketIOServer => {
  presenceManager = new PresenceManager(logger);
  notificationService = notificationServiceInstance;
  typingService = typingServiceInstance;
  metricsService = metricsServiceInstance;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  io.use(socketAuthMiddleware(logger));

  void setupPresenceHandlers(io, presenceManager, logger, notificationService, metricsService);
  void setupNotificationHandlers(io, notificationService, logger, metricsService);
  void setupTypingHandlers(io, typingService, logger, metricsService);

  logger.info('Socket.IO initialized successfully');

  return io;
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const getPresenceManager = (): PresenceManager => {
  if (!presenceManager) {
    throw new Error('Presence manager not initialized');
  }
  return presenceManager;
};

export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    throw new Error('Notification service not initialized');
  }
  return notificationService;
};

export const getTypingService = (): TypingService => {
  if (!typingService) {
    throw new Error('Typing service not initialized');
  }
  return typingService;
};

export const getMetricsService = (): MetricsService => {
  if (!metricsService) {
    throw new Error('Metrics service not initialized');
  }
  return metricsService;
};
