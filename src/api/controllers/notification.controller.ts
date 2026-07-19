import { Response, NextFunction } from 'express';
import { NotificationService } from '../../application/services/notification.service';
import {
  createNotificationSchema,
  markAsReadSchema,
  paginationSchema,
} from '../../shared/utils/validation';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Logger } from 'winston';

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: Logger
  ) {}

  async createNotification(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const senderId = req.user?.userId;
      if (!senderId) {
        this.logger.warn('Notification creation attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const validationResult = createNotificationSchema.safeParse(req.body);

      if (!validationResult.success) {
        this.logger.warn('Notification creation validation failed', {
          userId: senderId,
          errors: validationResult.error.errors,
        });
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

      this.logger.info('Notification created successfully', {
        notificationId: notification.id,
        senderId,
        receiverId: validationResult.data.receiverId,
      });

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      this.logger.error('Notification creation error', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
        this.logger.warn('Notification retrieval attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const validationResult = paginationSchema.safeParse({
        page: req.query['page'],
        limit: req.query['limit'],
      });

      if (!validationResult.success) {
        this.logger.warn('Notification pagination validation failed', {
          userId,
          errors: validationResult.error.errors,
        });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.notificationService.getNotifications(userId, validationResult.data);

      this.logger.info('Notifications retrieved successfully', {
        userId,
        count: result.notifications.length,
        page: validationResult.data.page,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.logger.error('Notification retrieval error', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        this.logger.warn('Mark as read attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { notificationId } = req.params;

      const validationResult = markAsReadSchema.safeParse({ notificationId });

      if (!validationResult.success) {
        this.logger.warn('Mark as read validation failed', {
          userId,
          notificationId,
          errors: validationResult.error.errors,
        });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const notification = await this.notificationService.markAsRead(
        userId,
        validationResult.data.notificationId
      );

      this.logger.info('Notification marked as read', {
        notificationId: validationResult.data['notificationId'],
        userId,
      });

      res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      this.logger.error('Mark as read error', {
        userId: req.user?.userId,
        notificationId: req.params['notificationId'],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        this.logger.warn('Mark all as read attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const updatedCount = await this.notificationService.markAllAsRead(userId);

      this.logger.info('All notifications marked as read', {
        userId,
        updatedCount,
      });

      res.status(200).json({
        success: true,
        data: {
          updatedCount,
        },
      });
    } catch (error) {
      this.logger.error('Mark all as read error', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
        this.logger.warn('Unread count retrieval attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const count = await this.notificationService.getUnreadCount(userId);

      this.logger.info('Unread count retrieved', {
        userId,
        count,
      });

      res.status(200).json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error) {
      this.logger.error('Unread count retrieval error', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
