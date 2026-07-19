/* eslint-disable @typescript-eslint/unbound-method */
import { NotificationService } from '../application/services/notification.service';
import { NotificationRepository } from '../infrastructure/repositories/notification.repository';
import { RedisPubSub } from '../infrastructure/redis/redis.pubsub';
import { Logger } from 'winston';
import { NotificationType, NotificationStatus } from '../shared/types/notification.types';

const mockPublish = jest.fn();
const mockSubscribe = jest.fn();

jest.mock('../infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../realtime/socket', () => ({
  getPresenceManager: jest.fn(),
  getSocketIO: jest.fn(),
}));

import { prisma } from '../infrastructure/database/prisma';
import { getPresenceManager, getSocketIO } from '../realtime/socket';

const createMockLogger = (): jest.Mocked<Logger> =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }) as unknown as jest.Mocked<Logger>;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockRepository: jest.Mocked<NotificationRepository>;
  let mockRedisPubSub: jest.Mocked<RedisPubSub>;
  let mockLogger: jest.Mocked<Logger>;

  const mockPresenceManager = {
    isUserOnline: jest.fn(),
    getUserSockets: jest.fn(),
    addSocket: jest.fn(),
    removeSocket: jest.fn(),
    getOnlineUsers: jest.fn(),
  };

  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByReceiver: jest.fn(),
      findByReceiverPaginated: jest.fn(),
      countByReceiver: jest.fn(),
      markDelivered: jest.fn(),
      markRead: jest.fn(),
      markAllAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
      findUnreadByReceiver: jest.fn(),
      findPendingNotifications: jest.fn(),
      findByIdWithSender: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    mockRedisPubSub = {
      connect: jest.fn(),
      subscribe: mockSubscribe,
      publish: mockPublish,
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<RedisPubSub>;

    mockLogger = createMockLogger();

    (getPresenceManager as jest.Mock).mockReturnValue(mockPresenceManager);
    (getSocketIO as jest.Mock).mockReturnValue(mockIo);

    notificationService = new NotificationService(
      mockRepository,
      mockRedisPubSub,
      'server-1',
      mockLogger
    );
  });

  describe('getNotifications', () => {
    it('should return paginated notifications for the authenticated user', async () => {
      const userId = 'user-1';
      const paginatedResult = {
        notifications: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockRepository.findByReceiverPaginated.mockResolvedValue(paginatedResult);

      const result = await notificationService.getNotifications(userId, { page: 1, limit: 20 });

      expect(mockRepository.findByReceiverPaginated).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotificationNotFoundError when notification does not exist', async () => {
      mockRepository.findByIdWithSender.mockResolvedValue(null);

      await expect(notificationService.markAsRead('user-1', 'missing-id')).rejects.toThrow(
        'Notification not found'
      );

      expect(mockRepository.findByIdWithSender).toHaveBeenCalledWith('missing-id');
      expect(mockRepository.markRead).not.toHaveBeenCalled();
    });

    it('should throw NotificationOwnershipError when notification belongs to another user', async () => {
      mockRepository.findByIdWithSender.mockResolvedValue({
        id: 'notification-1',
        receiverId: 'other-user',
        senderId: 'sender-1',
        title: 'Test',
        message: 'Test message',
        type: 'MESSAGE' as NotificationType,
        status: 'DELIVERED' as NotificationStatus,
        createdAt: new Date(),
        deliveredAt: new Date(),
        readAt: null,
        sender: { id: 'sender-1', email: 'sender@test.com', fullName: 'Sender' },
      });

      await expect(notificationService.markAsRead('user-1', 'notification-1')).rejects.toThrow(
        'You do not have permission to access this notification'
      );

      expect(mockRepository.markRead).not.toHaveBeenCalled();
    });

    it('should return notification without updating when already READ', async () => {
      const existingNotification = {
        id: 'notification-1',
        receiverId: 'user-1',
        senderId: 'sender-1',
        title: 'Test',
        message: 'Test message',
        type: 'MESSAGE' as NotificationType,
        status: 'READ' as NotificationStatus,
        createdAt: new Date(),
        deliveredAt: new Date(),
        readAt: new Date(),
        sender: { id: 'sender-1', email: 'sender@test.com', fullName: 'Sender' },
      };

      mockRepository.findByIdWithSender.mockResolvedValue(existingNotification);

      const result = await notificationService.markAsRead('user-1', 'notification-1');

      expect(result).toEqual(existingNotification);
      expect(mockRepository.markRead).not.toHaveBeenCalled();
    });

    it('should mark notification as READ when user owns it', async () => {
      const existingNotification = {
        id: 'notification-1',
        receiverId: 'user-1',
        senderId: 'sender-1',
        title: 'Test',
        message: 'Test message',
        type: 'MESSAGE' as NotificationType,
        status: 'DELIVERED' as NotificationStatus,
        createdAt: new Date(),
        deliveredAt: new Date(),
        readAt: null,
        sender: { id: 'sender-1', email: 'sender@test.com', fullName: 'Sender' },
      };

      const updatedNotification = {
        ...existingNotification,
        status: 'READ' as NotificationStatus,
        readAt: new Date(),
      };

      mockRepository.findByIdWithSender.mockResolvedValue(existingNotification);
      mockRepository.markRead.mockResolvedValue(updatedNotification);

      const result = await notificationService.markAsRead('user-1', 'notification-1');

      expect(mockRepository.markRead).toHaveBeenCalledWith('notification-1');
      expect(result).toEqual(updatedNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return count', async () => {
      mockRepository.markAllAsRead.mockResolvedValue(3);

      const result = await notificationService.markAllAsRead('user-1');

      expect(mockRepository.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(result).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for the authenticated user', async () => {
      mockRepository.getUnreadCount.mockResolvedValue(5);

      const result = await notificationService.getUnreadCount('user-1');

      expect(mockRepository.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toBe(5);
    });
  });

  describe('createNotification', () => {
    it('should emit and mark delivered when receiver is online locally', async () => {
      const input = {
        senderId: 'user-a',
        receiverId: 'user-b',
        title: 'Hello',
        message: 'Test message',
        type: 'MESSAGE' as NotificationType,
      };

      const createdNotification = {
        id: 'notification-1',
        ...input,
        status: 'PENDING' as NotificationStatus,
        createdAt: new Date(),
        deliveredAt: null,
        readAt: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'sender@test.com',
        fullName: 'Sender',
      });

      mockRepository.create.mockResolvedValue(createdNotification);
      mockPresenceManager.isUserOnline.mockReturnValue(true);
      mockPresenceManager.getUserSockets.mockReturnValue(['socket-1']);

      const result = await notificationService.createNotification(input);

      expect(mockIo.to).toHaveBeenCalledWith('socket-1');
      expect(mockRepository.markDelivered).toHaveBeenCalledWith('notification-1');
      expect(mockPublish).not.toHaveBeenCalled();
      expect(result).toEqual(createdNotification);
    });

    it('should publish to Redis when receiver is not online locally', async () => {
      const input = {
        senderId: 'user-a',
        receiverId: 'user-b',
        title: 'Hello',
        message: 'Test message',
        type: 'MESSAGE' as NotificationType,
      };

      const createdNotification = {
        id: 'notification-1',
        ...input,
        status: 'PENDING' as NotificationStatus,
        createdAt: new Date(),
        deliveredAt: null,
        readAt: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'sender@test.com',
        fullName: 'Sender',
      });

      mockRepository.create.mockResolvedValue(createdNotification);
      mockPresenceManager.isUserOnline.mockReturnValue(false);

      await notificationService.createNotification(input);

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceInstanceId: 'server-1',
          notificationId: 'notification-1',
          receiverId: 'user-b',
          senderId: 'user-a',
          title: 'Hello',
          message: 'Test message',
          type: 'MESSAGE',
        })
      );
      expect(mockRepository.markDelivered).not.toHaveBeenCalled();
    });
  });
});
