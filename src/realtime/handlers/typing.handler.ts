import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middlewares/socket.auth.middleware';
import { TypingService } from '../../application/services/typing.service';
import { MetricsService } from '../../application/services/metrics.service';
import { getPresenceManager } from '../socket';
import { Logger } from 'winston';
import { TypingStartPayload, TypingStopPayload } from '../../shared/types/typing.types';

export const setupTypingHandlers = (
  io: SocketIOServer,
  typingService: TypingService,
  logger: Logger,
  _metricsService: MetricsService
): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      logger.warn('Unauthenticated socket connection attempted in typing handler');
      socket.disconnect();
      return;
    }

    const { userId } = socket.user;
    const presenceManager = getPresenceManager();

    socket.on(
      'typing:start',
      async (
        data: TypingStartPayload,
        callback?: (response: { success: boolean; error?: string }) => void
      ) => {
        try {
          if (!data.receiverId) {
            logger.warn('Typing start event missing receiverId', {
              userId,
              socketId: socket.id,
            });

            callback?.({ success: false, error: 'receiverId is required' });
            return;
          }

          const isReceiverValid = presenceManager.isUserOnline(data.receiverId);

          if (!isReceiverValid) {
            logger.info('Typing start event - receiver offline, will still publish', {
              userId,
              receiverId: data.receiverId,
              socketId: socket.id,
            });
          }

          await typingService.handleTypingStart(userId, data.receiverId);

          callback?.({ success: true });
        } catch (error) {
          logger.error('Error handling typing start event', {
            userId,
            socketId: socket.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          socket.emit('typing:error', {
            error: 'Failed to process typing indicator',
          });

          callback?.({ success: false, error: 'Failed to process typing indicator' });
        }
      }
    );

    socket.on(
      'typing:stop',
      async (
        data: TypingStopPayload,
        callback?: (response: { success: boolean; error?: string }) => void
      ) => {
        try {
          if (!data.receiverId) {
            logger.warn('Typing stop event missing receiverId', {
              userId,
              socketId: socket.id,
            });

            callback?.({ success: false, error: 'receiverId is required' });
            return;
          }

          const isReceiverValid = presenceManager.isUserOnline(data.receiverId);

          if (!isReceiverValid) {
            logger.info('Typing stop event - receiver offline, will still publish', {
              userId,
              receiverId: data.receiverId,
              socketId: socket.id,
            });
          }

          await typingService.handleTypingStop(userId, data.receiverId);

          callback?.({ success: true });
        } catch (error) {
          logger.error('Error handling typing stop event', {
            userId,
            socketId: socket.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          socket.emit('typing:error', {
            error: 'Failed to process typing indicator',
          });

          callback?.({ success: false, error: 'Failed to process typing indicator' });
        }
      }
    );

    socket.on('error', (error: Error) => {
      logger.error('Socket error in typing handler', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });
};