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

let io: SocketIOServer | null = null;
let presenceManager: PresenceManager | null = null;
let notificationService: NotificationService | null = null;
let typingService: TypingService | null = null;

export const initializeSocketIO = (
  httpServer: HTTPServer,
  env: Env,
  notificationServiceInstance: NotificationService,
  typingServiceInstance: TypingService,
  logger: Logger
): SocketIOServer => {
  presenceManager = new PresenceManager(logger);
  notificationService = notificationServiceInstance;
  typingService = typingServiceInstance;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      credentials: true,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  io.use(socketAuthMiddleware(logger));

  void setupPresenceHandlers(io, presenceManager, logger, notificationService);
  void setupNotificationHandlers(io, notificationService, logger);
  void setupTypingHandlers(io, typingService, logger);

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
