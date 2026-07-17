import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middlewares/socket.auth.middleware';
import { PresenceManager } from '../presence.manager';
import { Logger } from 'winston';

export const setupPresenceHandlers = (
  io: SocketIOServer,
  presenceManager: PresenceManager,
  logger: Logger
): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      logger.warn('Unauthenticated socket connection attempted');
      socket.disconnect();
      return;
    }

    const { userId, email } = socket.user;

    presenceManager.addUser({
      userId,
      email,
      socketId: socket.id,
      connectedAt: new Date(),
    });

    io.emit('user:online', {
      userId,
      online: true,
    });

    logger.info('Socket connected', {
      userId,
      email,
      socketId: socket.id,
    });

    socket.on('disconnect', () => {
      const user = presenceManager.removeUser(socket.id);

      if (user) {
        const sockets = presenceManager.getUserSockets(user.userId);

        if (sockets.length === 0) {
          io.emit('user:offline', {
            userId: user.userId,
            online: false,
          });
        }
      }

      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId,
      });
    });

    socket.on('error', (error: Error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });
};
