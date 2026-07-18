/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
// @ts-nocheck
import { prisma } from '../database/prisma';
import {
  CreateNotificationInput,
  NotificationResponse,
  NotificationWithSender,
} from '../../shared/types/notification.types';

export class NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await prisma.notification.create({
      data: {
        senderId: input.senderId,
        receiverId: input.receiverId,
        title: input.title,
        message: input.message,
        type: input.type,
        status: 'PENDING',
      },
    });

    return this.mapToResponse(notification);
  }

  async findById(id: string): Promise<NotificationResponse | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    return notification ? this.mapToResponse(notification) : null;
  }

  async findByReceiver(receiverId: string): Promise<NotificationWithSender[]> {
    const notifications = await prisma.notification.findMany({
      where: { receiverId },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) => this.mapToWithSender(notification));
  }

  async markDelivered(id: string): Promise<NotificationResponse> {
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    return this.mapToResponse(notification);
  }

  async markRead(id: string): Promise<NotificationResponse> {
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return this.mapToResponse(notification);
  }

  async getUnreadCount(receiverId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        receiverId,
        status: {
          in: ['PENDING', 'DELIVERED'],
        },
      },
    });
  }

  async findUnreadByReceiver(receiverId: string): Promise<NotificationWithSender[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId,
        status: {
          in: ['PENDING', 'DELIVERED'],
        },
      },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) => this.mapToWithSender(notification));
  }

  async findPendingNotifications(receiverId: string): Promise<NotificationWithSender[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId,
        status: 'PENDING',
      },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) => this.mapToWithSender(notification));
  }

  async findByIdWithSender(id: string): Promise<NotificationWithSender | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        sender: true,
      },
    });

    return notification ? this.mapToWithSender(notification) : null;
  }

  private mapToResponse(notification: any): NotificationResponse {
    return {
      id: notification.id,
      senderId: notification.senderId,
      receiverId: notification.receiverId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      status: notification.status,
      createdAt: notification.createdAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
    };
  }

  private mapToWithSender(notification: any): NotificationWithSender {
    return {
      ...this.mapToResponse(notification),
      sender: notification.sender,
    };
  }
}
