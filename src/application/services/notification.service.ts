import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { RedisPubSub, RedisPubSubMessage } from '../../infrastructure/redis/redis.pubsub';
import { getPresenceManager } from '../../realtime/socket';
import { getSocketIO } from '../../realtime/socket';
import {
  CreateNotificationInput,
  NotificationResponse,
  NotificationPayload,
  NotificationWithSender,
} from '../../shared/types/notification.types';
import { Logger } from 'winston';
import { prisma } from '../../infrastructure/database/prisma';

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly redisPubSub: RedisPubSub,
    private readonly instanceId: string,
    private readonly logger: Logger
  ) {}

  async createNotification(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.create(input);

    const sender = await prisma.user.findUnique({
      where: { id: input.senderId },
      select: { email: true, fullName: true },
    });

    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(input.receiverId);

    const payload: NotificationPayload = {
      id: notification.id,
      senderId: input.senderId,
      senderEmail: sender?.email || '',
      senderName: sender?.fullName || '',
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
    };

    if (isReceiverOnline) {
      const io = getSocketIO();
      const receiverSockets = presenceManager.getUserSockets(input.receiverId);

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
      await this.redisPubSub.publish({
        sourceInstanceId: this.instanceId,
        notificationId: notification.id,
        receiverId: input.receiverId,
        senderId: input.senderId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt.toISOString(),
        senderName: sender?.fullName || '',
        senderEmail: sender?.email || '',
      });

      this.logger.info('Notification published to Redis for cross-instance delivery', {
        notificationId: notification.id,
        receiverId: input.receiverId,
        sourceInstanceId: this.instanceId,
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

  async getUnreadNotifications(receiverId: string): Promise<NotificationWithSender[]> {
    return this.notificationRepository.findUnreadByReceiver(receiverId);
  }

  async getPendingNotifications(receiverId: string): Promise<NotificationWithSender[]> {
    return this.notificationRepository.findPendingNotifications(receiverId);
  }

  async getNotificationWithSender(notificationId: string): Promise<NotificationWithSender | null> {
    return this.notificationRepository.findByIdWithSender(notificationId);
  }

  async markAsDelivered(notificationId: string): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.markDelivered(notificationId);

    this.logger.info('Notification marked as delivered', {
      notificationId,
    });

    return notification;
  }

  async syncNotificationsForUser(userId: string, socketId: string): Promise<void> {
    const unreadNotifications = await this.getUnreadNotifications(userId);

    if (unreadNotifications.length > 0) {
      const io = getSocketIO();

      for (const notification of unreadNotifications) {
        const payload: NotificationPayload = {
          id: notification.id,
          senderId: notification.senderId,
          senderEmail: notification.sender.email,
          senderName: notification.sender.fullName,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          createdAt: notification.createdAt,
        };

        io.to(socketId).emit('notification:new', payload);

        this.logger.info('Notification synced to user', {
          notificationId: notification.id,
          userId,
          socketId,
        });
      }

      this.logger.info('Notification sync completed', {
        userId,
        socketId,
        syncedCount: unreadNotifications.length,
      });
    } else {
      this.logger.info('No unread notifications to sync', {
        userId,
        socketId,
      });
    }
  }

  async handleRedisNotification(message: RedisPubSubMessage): Promise<void> {
    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(message.receiverId);

    if (!isReceiverOnline) {
      this.logger.info('Redis event ignored - receiver not connected locally', {
        notificationId: message.notificationId,
        receiverId: message.receiverId,
        instanceId: this.instanceId,
      });
      return;
    }

    const io = getSocketIO();
    const receiverSockets = presenceManager.getUserSockets(message.receiverId);

    const payload = {
      id: message.notificationId,
      senderId: message.senderId,
      senderEmail: message.senderEmail,
      senderName: message.senderName,
      title: message.title,
      message: message.message,
      type: message.type,
      createdAt: new Date(message.createdAt),
    } as NotificationPayload;

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit('notification:new', payload);
    });

    await this.notificationRepository.markDelivered(message.notificationId);

    this.logger.info('Notification delivered through Redis', {
      notificationId: message.notificationId,
      receiverId: message.receiverId,
      socketCount: receiverSockets.length,
      instanceId: this.instanceId,
    });
  }
}
