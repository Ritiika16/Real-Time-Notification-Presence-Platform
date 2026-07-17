import { Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../../infrastructure/auth/jwt';
import { Logger } from 'winston';

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export const socketAuthMiddleware =
  (logger: Logger) =>
  (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
    try {
      let token: string | undefined;

      const authHeader = socket.handshake.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (socket.handshake.auth['token']) {
        token = socket.handshake.auth['token'] as string;
      }

      if (!token) {
        logger.warn('Socket connection attempt without token');
        return next(new Error('Authentication failed: No token provided'));
      }

      const secret = process.env['JWT_SECRET'];

      if (!secret) {
        logger.error('JWT_SECRET not configured');
        return next(new Error('Server configuration error'));
      }

      const payload = verifyToken(token, secret);

      socket.user = payload;

      logger.info('Socket authenticated successfully', {
        userId: payload.userId,
        email: payload.email,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          logger.warn('Socket connection attempt with expired token');
          return next(new Error('Authentication failed: Token expired'));
        }
        if (error.name === 'JsonWebTokenError') {
          logger.warn('Socket connection attempt with invalid token');
          return next(new Error('Authentication failed: Invalid token'));
        }
      }

      logger.error('Unexpected socket authentication error');
      return next(new Error('Authentication failed'));
    }
  };
