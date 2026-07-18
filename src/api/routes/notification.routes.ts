import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { NotificationService } from '../../application/services/notification.service';
import { AuthService } from '../../application/services/auth.service';
import { Logger } from 'winston';

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - title
 *               - message
 *               - type
 *             properties:
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               type:
 *                 type: string
 *                 enum: [INFO, MESSAGE, ALERT, SYSTEM]
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notification:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get current user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/notifications/unread/count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notification:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

export const createNotificationRoutes = (
  notificationService: NotificationService,
  authService: AuthService,
  logger: Logger
): Router => {
  const router = Router();
  const notificationController = new NotificationController(notificationService);

  router.post('/', authenticate(authService, logger), (req, res, next) => {
    void notificationController.createNotification(req as AuthenticatedRequest, res, next);
  });

  router.get('/', authenticate(authService, logger), (req, res, next) => {
    void notificationController.getNotifications(req as AuthenticatedRequest, res, next);
  });

  router.get('/unread/count', authenticate(authService, logger), (req, res, next) => {
    void notificationController.getUnreadCount(req as AuthenticatedRequest, res, next);
  });

  router.patch('/:notificationId/read', authenticate(authService, logger), (req, res, next) => {
    void notificationController.markAsRead(req as AuthenticatedRequest, res, next);
  });

  return router;
};
