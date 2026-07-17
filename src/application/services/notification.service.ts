import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { getPresenceManager } from '../../realtime/socket';
import { getSocketIO } from '../../realtime/socket';
import {
  CreateNotificationInput,
  NotificationResponse,
  NotificationPayload,
  NotificationWithSender,
} from '../../shared/types/notification.types';
import { Logger } from 'winston';

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: Logger
  ) {}

  async createNotification(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.create(input);

    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(input.receiverId);

    if (isReceiverOnline) {
      const io = getSocketIO();
      const receiverSockets = presenceManager.getUserSockets(input.receiverId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: NotificationPayload = {
        id: notification.id,
        senderId: input.senderId,
        senderEmail: '',
        senderName: '',
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt,
      };

      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit('notification:new', payload);
      });

      await this.notificationRepository.markDelivered(notification.id);

      this.logger.info('Notification delivered to online user', {
        notificationId: notification.id,
        receiverId: input.receiverId,
        socketCount: receiverSockets.length,
      });
    } else {
      this.logger.info('Notification stored for offline user', {
        notificationId: notification.id,
        receiverId: input.receiverId,
      });
    }

    return notification;
  }

  async getNotifications(receiverId: string): Promise<NotificationWithSender[]> {
    return this.notificationRepository.findByReceiver(receiverId);
  }

  async markAsRead(notificationId: string): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.markRead(notificationId);

    this.logger.info('Notification marked as read', {
      notificationId,
    });

    return notification;
  }

  async getUnreadCount(receiverId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(receiverId);
  }
}
