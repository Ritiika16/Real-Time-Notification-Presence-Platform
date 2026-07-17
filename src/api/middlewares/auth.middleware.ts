import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { Logger } from 'winston';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticate =
  (authService: AuthService, logger: Logger) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authentication attempt without valid authorization header');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const token = authHeader.substring(7);
      const secret = process.env['JWT_SECRET'] || '';

      if (!secret) {
        logger.error('JWT_SECRET not configured');
        res.status(500).json({
          success: false,
          error: 'Server configuration error',
        });
        return;
      }

      const payload = authService.verifyAccessToken(token, secret);

      req.user = {
        userId: payload.userId,
        email: payload.email,
      };

      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          logger.warn('Authentication attempt with expired token');
          res.status(401).json({
            success: false,
            error: 'Token expired',
          });
          return;
        }
        if (error.name === 'JsonWebTokenError') {
          logger.warn('Authentication attempt with invalid token');
          res.status(401).json({
            success: false,
            error: 'Invalid token',
          });
          return;
        }
      }

      logger.error('Unexpected authentication error');
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
  };
