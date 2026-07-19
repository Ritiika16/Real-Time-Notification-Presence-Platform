import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { RedisPubSub, RedisPubSubMessage } from '../../infrastructure/redis/redis.pubsub';
import { getPresenceManager } from '../../realtime/socket';
import { getSocketIO } from '../../realtime/socket';
import { getMetricsService } from '../../realtime/socket';
import {
  CreateNotificationInput,
  NotificationResponse,
  NotificationPayload,
  NotificationWithSender,
  PaginatedNotifications,
  PaginationParams,
} from '../../shared/types/notification.types';
import { ReadReceiptPubSubMessage, ReadReceiptEventPayload } from '../../shared/types/read-receipt.types';
import { Logger } from 'winston';
import { prisma } from '../../infrastructure/database/prisma';

export class NotificationNotFoundError extends Error {
  constructor() {
    super('Notification not found');
    this.name = 'NotificationNotFoundError';
  }
}

export class NotificationOwnershipError extends Error {
  constructor() {
    super('You do not have permission to access this notification');
    this.name = 'NotificationOwnershipError';
  }
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly redisPubSub: RedisPubSub,
    private readonly instanceId: string,
    private readonly logger: Logger
  ) {}

  async createNotification(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.create(input);

    const metricsService = getMetricsService();
    metricsService.incrementNotificationsCreated();

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

      metricsService.incrementNotificationsDelivered();

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

      metricsService.incrementNotificationsStoredOffline();

      this.logger.info('Notification published to Redis for cross-instance delivery', {
        notificationId: notification.id,
        receiverId: input.receiverId,
        sourceInstanceId: this.instanceId,
      });
    }

    return notification;
  }

  async getNotifications(
    receiverId: string,
    params: PaginationParams
  ): Promise<PaginatedNotifications> {
    return this.notificationRepository.findByReceiverPaginated(receiverId, params);
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.findByIdWithSender(notificationId);

    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (notification.receiverId !== userId) {
      throw new NotificationOwnershipError();
    }

    if (notification.status === 'READ') {
      return notification;
    }

    const updatedNotification = await this.notificationRepository.markRead(notificationId);

    this.logger.info('Notification marked as read', {
      notificationId,
      userId,
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const updatedCount = await this.notificationRepository.markAllAsRead(userId);

    this.logger.info('All notifications marked as read', {
      userId,
      updatedCount,
    });

    return updatedCount;
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

    const metricsService = getMetricsService();
    metricsService.incrementRedisPubSubMessage('notification');

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

    metricsService.incrementNotificationsDelivered();

    this.logger.info('Notification delivered through Redis', {
      notificationId: message.notificationId,
      receiverId: message.receiverId,
      socketCount: receiverSockets.length,
      instanceId: this.instanceId,
    });
  }

  async sendReadReceipt(
    notificationId: string,
    readBy: string,
    senderId: string
  ): Promise<void> {
    const presenceManager = getPresenceManager();
    const isSenderOnline = presenceManager.isUserOnline(senderId);

    const payload: ReadReceiptEventPayload = {
      notificationId,
      readBy,
      readAt: new Date().toISOString(),
    };

    if (isSenderOnline) {
      const io = getSocketIO();
      const senderSockets = presenceManager.getUserSockets(senderId);

      senderSockets.forEach((socketId) => {
        io.to(socketId).emit('notification:read', payload);
      });

      this.logger.info('Read receipt sent to online sender', {
        notificationId,
        readBy,
        senderId,
        socketCount: senderSockets.length,
      });
    } else {
      await this.redisPubSub.publishReadReceipt({
        sourceInstanceId: this.instanceId,
        notificationId,
        readBy,
        readAt: payload.readAt,
        senderId,
      });

      this.logger.info('Read receipt published to Redis for cross-instance delivery', {
        notificationId,
        readBy,
        senderId,
        sourceInstanceId: this.instanceId,
      });
    }
  }

  async handleRedisReadReceipt(message: ReadReceiptPubSubMessage): Promise<void> {
    const presenceManager = getPresenceManager();
    const isSenderOnline = presenceManager.isUserOnline(message.senderId);

    if (!isSenderOnline) {
      this.logger.info('Redis read receipt event ignored - sender not connected locally', {
        notificationId: message.notificationId,
        senderId: message.senderId,
        instanceId: this.instanceId,
      });
      return;
    }

    const metricsService = getMetricsService();
    metricsService.incrementRedisPubSubMessage('read-receipt');

    const io = getSocketIO();
    const senderSockets = presenceManager.getUserSockets(message.senderId);

    const payload: ReadReceiptEventPayload = {
      notificationId: message.notificationId,
      readBy: message.readBy,
      readAt: message.readAt,
    };

    senderSockets.forEach((socketId) => {
      io.to(socketId).emit('notification:read', payload);
    });

    this.logger.info('Read receipt delivered through Redis', {
      notificationId: message.notificationId,
      senderId: message.senderId,
      socketCount: senderSockets.length,
      instanceId: this.instanceId,
    });
  }
}
