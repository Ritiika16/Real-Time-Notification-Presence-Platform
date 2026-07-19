import { Request, Response, NextFunction } from 'express';
import { getPresenceManager } from '../../realtime/socket';
import { Logger } from 'winston';

export class UsersController {
  constructor(private readonly logger: Logger) {}

  getOnlineUsers(_req: Request, res: Response, next: NextFunction): void {
    try {
      const presenceManager = getPresenceManager();
      const onlineUsers = presenceManager.getOnlineUsers();
      const onlineCount = presenceManager.getOnlineCount();

      this.logger.info('Online users retrieved', {
        count: onlineCount,
      });

      res.status(200).json({
        count: onlineCount,
        users: onlineUsers.map((user) => ({
          userId: user.userId,
          email: user.email,
          connectedAt: user.connectedAt,
        })),
      });
    } catch (error) {
      this.logger.error('Online users retrieval error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
