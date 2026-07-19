import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middlewares/socket.auth.middleware';
import { PresenceManager } from '../presence.manager';
import { Logger } from 'winston';
import { NotificationService } from '../../application/services/notification.service';

export const setupPresenceHandlers = (
  io: SocketIOServer,
  presenceManager: PresenceManager,
  logger: Logger,
  notificationService: NotificationService
): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      logger.warn('Unauthenticated socket connection attempted');
      socket.disconnect();
      return;
    }

    const { userId, email } = socket.user;

    const existingSockets = presenceManager.getUserSockets(userId);
    const isReconnection = existingSockets.length > 0;

    presenceManager.addUser({
      userId,
      email,
      socketId: socket.id,
      connectedAt: new Date(),
    });

    if (!isReconnection) {
      io.emit('user:online', {
        userId,
        online: true,
      });

      logger.info('User came online', {
        userId,
        email,
        socketId: socket.id,
      });
    } else {
      logger.info('User reconnected with additional socket', {
        userId,
        email,
        socketId: socket.id,
        totalSockets: existingSockets.length + 1,
      });
    }

    // Sync pending notifications when the user connects
    void notificationService.syncNotificationsForUser(userId, socket.id);

    // ─────────────────────────────────────────────
    // TYPING START
    // ─────────────────────────────────────────────
    socket.on(
      'typing:start',
      ({ receiverId }: { receiverId: string }) => {
        const receiverSockets = presenceManager.getUserSockets(receiverId);

        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit('user:typing', {
            userId,
            isTyping: true,
          });
        });

        logger.info('Typing started', {
          userId,
          receiverId,
          socketCount: receiverSockets.length,
        });
      }
    );

    // ─────────────────────────────────────────────
    // TYPING STOP
    // ─────────────────────────────────────────────
    socket.on(
      'typing:stop',
      ({ receiverId }: { receiverId: string }) => {
        const receiverSockets = presenceManager.getUserSockets(receiverId);

        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit('user:typing', {
            userId,
            isTyping: false,
          });
        });

        logger.info('Typing stopped', {
          userId,
          receiverId,
          socketCount: receiverSockets.length,
        });
      }
    );

    // ─────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const user = presenceManager.removeUser(socket.id);

      if (user) {
        const remainingSockets = presenceManager.getUserSockets(user.userId);

        if (remainingSockets.length === 0) {
          io.emit('user:offline', {
            userId: user.userId,
            online: false,
          });

          logger.info('User went offline', {
            userId: user.userId,
            email: user.email,
            reason,
          });
        } else {
          logger.info('User still online with remaining sockets', {
            userId: user.userId,
            email: user.email,
            remainingSockets: remainingSockets.length,
            reason,
          });
        }
      } else {
        logger.warn(
          'Socket disconnected but no user found in presence manager',
          {
            socketId: socket.id,
            reason,
          }
        );
      }
    });

    // ─────────────────────────────────────────────
    // SOCKET ERROR
    // ─────────────────────────────────────────────
    socket.on('error', (error: Error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });
};