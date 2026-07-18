import { Response, NextFunction } from 'express';
import { NotificationService } from '../../application/services/notification.service';
import { createNotificationSchema, markAsReadSchema } from '../../shared/utils/validation';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async createNotification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const senderId = req.user?.userId;
      if (!senderId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const validationResult = createNotificationSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const notification = await this.notificationService.createNotification({
        senderId,
        receiverId: validationResult.data.receiverId,
        title: validationResult.data.title,
        message: validationResult.data.message,
        type: validationResult.data.type,
      });

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const notifications = await this.notificationService.getNotifications(userId);

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notificationId } = req.params;

      const validationResult = markAsReadSchema.safeParse({ notificationId });

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const notification = await this.notificationService.markAsRead(
        validationResult.data.notificationId
      );

      res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const count = await this.notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      next(error);
    }
  }
}
