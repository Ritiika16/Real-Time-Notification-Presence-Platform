import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';

/**
 * @swagger
 * /api/v1/users/online:
 *   get:
 *     summary: Get list of online users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Online users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                         format: email
 *                       connectedAt:
 *                         type: string
 *                         format: date-time
 */

export const createUsersRoutes = (): Router => {
  const router = Router();
  const usersController = new UsersController();

  router.get('/online', (req, res, next) => {
    void usersController.getOnlineUsers(req, res, next);
  });

  return router;
};
