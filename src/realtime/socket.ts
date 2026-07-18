import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createLogger } from '../infrastructure/logger/logger';
import { Env } from '../infrastructure/config/env';
import { PresenceManager } from './presence.manager';
import { socketAuthMiddleware } from './middlewares/socket.auth.middleware';
import { setupPresenceHandlers } from './handlers/presence.handler';
import { setupNotificationHandlers } from './handlers/notification.handler';
import { NotificationService } from '../application/services/notification.service';

let io: SocketIOServer | null = null;
let presenceManager: PresenceManager | null = null;
let notificationService: NotificationService | null = null;

export const initializeSocketIO = (
  httpServer: HTTPServer,
  env: Env,
  notificationServiceInstance: NotificationService
): SocketIOServer => {
  const logger = createLogger(env);
  presenceManager = new PresenceManager(logger);
  notificationService = notificationServiceInstance;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware(logger));

  void setupPresenceHandlers(io, presenceManager, logger, notificationService);
  void setupNotificationHandlers(io, notificationService, logger);

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
