import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middlewares/socket.auth.middleware';
import { NotificationService } from '../../application/services/notification.service';
import { Logger } from 'winston';

export const setupNotificationHandlers = (
  io: SocketIOServer,
  notificationService: NotificationService,
  logger: Logger
): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      logger.warn('Unauthenticated socket connection attempted in notification handler');
      socket.disconnect();
      return;
    }

    const { userId } = socket.user;

    socket.on('notification:read', async (data: { notificationId: string }) => {
      try {
        const notification = await notificationService.markAsRead(data.notificationId);

        io.to(socket.id).emit('notification:read', {
          notificationId: notification.id,
          status: notification.status,
          readAt: notification.readAt,
        });

        logger.info('Notification marked as read via socket', {
          userId,
          notificationId: data.notificationId,
        });
      } catch (error) {
        logger.error('Error marking notification as read via socket', {
          userId,
          notificationId: data.notificationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        socket.emit('notification:error', {
          error: 'Failed to mark notification as read',
        });
      }
    });

    socket.on('notification:delivered', (data: { notificationId: string }) => {
      try {
        logger.info('Notification delivery acknowledged via socket', {
          userId,
          notificationId: data.notificationId,
        });

        socket.emit('notification:delivered', {
          notificationId: data.notificationId,
        });
      } catch (error) {
        logger.error('Error acknowledging notification delivery via socket', {
          userId,
          notificationId: data.notificationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    socket.on('error', (error: Error) => {
      logger.error('Socket error in notification handler', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });
};
