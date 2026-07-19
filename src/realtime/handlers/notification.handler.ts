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

    socket.on(
      'notification:read',
      async (
        data: { notificationId: string },
        callback?: (response: { success: boolean; error?: string }) => void
      ) => {
        try {
          const notification = await notificationService.getNotificationWithSender(
            data.notificationId
          );

          if (!notification) {
            logger.warn('Notification not found for read request', {
              userId,
              notificationId: data.notificationId,
            });

            callback?.({ success: false, error: 'Notification not found' });
            return;
          }

          if (notification.receiverId !== userId) {
            logger.warn('Unauthorized read attempt on notification', {
              userId,
              notificationId: data.notificationId,
              receiverId: notification.receiverId,
            });

            callback?.({ success: false, error: 'Unauthorized' });
            return;
          }

          const updatedNotification = await notificationService.markAsRead(
            userId,
            data.notificationId
          );

          io.to(socket.id).emit('notification:read:success', {
            notificationId: updatedNotification.id,
            status: updatedNotification.status,
            readAt: updatedNotification.readAt,
          });

          logger.info('Notification marked as read via socket', {
            userId,
            notificationId: data.notificationId,
          });

          callback?.({ success: true });
        } catch (error) {
          logger.error('Error marking notification as read via socket', {
            userId,
            notificationId: data.notificationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          socket.emit('notification:error', {
            error: 'Failed to mark notification as read',
          });

          callback?.({ success: false, error: 'Failed to mark notification as read' });
        }
      }
    );

    socket.on(
      'notification:received',
      async (
        data: { notificationId: string },
        callback?: (response: { success: boolean; error?: string }) => void
      ) => {
        try {
          const notification = await notificationService.getNotificationWithSender(
            data.notificationId
          );

          if (!notification) {
            logger.warn('Notification not found for received acknowledgement', {
              userId,
              notificationId: data.notificationId,
            });

            callback?.({ success: false, error: 'Notification not found' });
            return;
          }

          if (notification.receiverId !== userId) {
            logger.warn('Unauthorized received acknowledgement on notification', {
              userId,
              notificationId: data.notificationId,
              receiverId: notification.receiverId,
            });

            callback?.({ success: false, error: 'Unauthorized' });
            return;
          }

          if (notification.status === 'PENDING') {
            await notificationService.markAsDelivered(data.notificationId);

            logger.info('Notification acknowledged and marked as delivered', {
              userId,
              notificationId: data.notificationId,
            });
          } else {
            logger.info('Notification acknowledged (already delivered)', {
              userId,
              notificationId: data.notificationId,
              currentStatus: notification.status,
            });
          }

          callback?.({ success: true });
        } catch (error) {
          logger.error('Error acknowledging notification receipt', {
            userId,
            notificationId: data.notificationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          callback?.({ success: false, error: 'Failed to acknowledge notification' });
        }
      }
    );

    socket.on('error', (error: Error) => {
      logger.error('Socket error in notification handler', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });
};
