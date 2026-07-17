import { Request, Response, NextFunction } from 'express';
import { getPresenceManager } from '../../realtime/socket';

export class UsersController {
  getOnlineUsers(_req: Request, res: Response, next: NextFunction): void {
    try {
      const presenceManager = getPresenceManager();
      const onlineUsers = presenceManager.getOnlineUsers();
      const onlineCount = presenceManager.getOnlineCount();

      res.status(200).json({
        count: onlineCount,
        users: onlineUsers.map((user) => ({
          userId: user.userId,
          email: user.email,
          connectedAt: user.connectedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
