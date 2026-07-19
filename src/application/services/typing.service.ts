import { RedisPubSub } from '../../infrastructure/redis/redis.pubsub';
import { getPresenceManager } from '../../realtime/socket';
import { getSocketIO } from '../../realtime/socket';
import { TypingPubSubMessage, TypingEventPayload } from '../../shared/types/typing.types';
import { Logger } from 'winston';

export class TypingService {
  constructor(
    private readonly redisPubSub: RedisPubSub,
    private readonly instanceId: string,
    private readonly logger: Logger
  ) {}

  async handleTypingStart(senderId: string, receiverId: string): Promise<void> {
    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(receiverId);

    const payload: TypingEventPayload = {
      userId: senderId,
      isTyping: true,
    };

    if (isReceiverOnline) {
      const io = getSocketIO();
      const receiverSockets = presenceManager.getUserSockets(receiverId);

      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit('user:typing', payload);
      });

      this.logger.info('Typing indicator sent to online user', {
        senderId,
        receiverId,
        socketCount: receiverSockets.length,
      });
    } else {
      await this.redisPubSub.publishTyping({
        sourceInstanceId: this.instanceId,
        senderId,
        receiverId,
        isTyping: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Typing indicator published to Redis for cross-instance delivery', {
        senderId,
        receiverId,
        sourceInstanceId: this.instanceId,
      });
    }
  }

  async handleTypingStop(senderId: string, receiverId: string): Promise<void> {
    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(receiverId);

    const payload: TypingEventPayload = {
      userId: senderId,
      isTyping: false,
    };

    if (isReceiverOnline) {
      const io = getSocketIO();
      const receiverSockets = presenceManager.getUserSockets(receiverId);

      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit('user:typing', payload);
      });

      this.logger.info('Typing stop indicator sent to online user', {
        senderId,
        receiverId,
        socketCount: receiverSockets.length,
      });
    } else {
      await this.redisPubSub.publishTyping({
        sourceInstanceId: this.instanceId,
        senderId,
        receiverId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Typing stop indicator published to Redis for cross-instance delivery', {
        senderId,
        receiverId,
        sourceInstanceId: this.instanceId,
      });
    }
  }

  async handleRedisTyping(message: TypingPubSubMessage): Promise<void> {
    const presenceManager = getPresenceManager();
    const isReceiverOnline = presenceManager.isUserOnline(message.receiverId);

    if (!isReceiverOnline) {
      this.logger.info('Redis typing event ignored - receiver not connected locally', {
        senderId: message.senderId,
        receiverId: message.receiverId,
        instanceId: this.instanceId,
      });
      return;
    }

    const io = getSocketIO();
    const receiverSockets = presenceManager.getUserSockets(message.receiverId);

    const payload: TypingEventPayload = {
      userId: message.senderId,
      isTyping: message.isTyping,
    };

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit('user:typing', payload);
    });

    this.logger.info('Typing indicator delivered through Redis', {
      senderId: message.senderId,
      receiverId: message.receiverId,
      socketCount: receiverSockets.length,
      instanceId: this.instanceId,
    });
  }
}