import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { TypingPubSubMessage } from '../../shared/types/typing.types';
import { ReadReceiptPubSubMessage } from '../../shared/types/read-receipt.types';

export interface RedisPubSubMessage {
  sourceInstanceId: string;
  notificationId: string;
  receiverId: string;
  senderId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  senderName: string;
  senderEmail: string;
}

export type PubSubMessageType = 'notification' | 'typing' | 'read-receipt';

export interface PubSubMessage {
  type: PubSubMessageType;
  data: RedisPubSubMessage | TypingPubSubMessage | ReadReceiptPubSubMessage;
}

export type NotificationPubSubHandler = (message: RedisPubSubMessage) => void | Promise<void>;
export type TypingPubSubHandler = (message: TypingPubSubMessage) => void | Promise<void>;
export type ReadReceiptPubSubHandler = (message: ReadReceiptPubSubMessage) => void | Promise<void>;

const NOTIFICATIONS_CHANNEL = 'notifications';
const TYPING_CHANNEL = 'typing';
const READ_RECEIPT_CHANNEL = 'read-receipts';

export class RedisPubSub {
  private readonly publisher: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly logger: Logger;
  private readonly instanceId: string;
  private isSubscribed = false;
  private notificationHandler: NotificationPubSubHandler | null = null;
  private typingHandler: TypingPubSubHandler | null = null;
  private readReceiptHandler: ReadReceiptPubSubHandler | null = null;

  constructor(
    publisher: RedisClientType,
    subscriber: RedisClientType,
    logger: Logger,
    instanceId: string
  ) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.logger = logger;
    this.instanceId = instanceId;
  }

  async connect(): Promise<void> {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async subscribe(
    handlers: {
      notification?: NotificationPubSubHandler;
      typing?: TypingPubSubHandler;
      readReceipt?: ReadReceiptPubSubHandler;
    }
  ): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    this.notificationHandler = handlers.notification || null;
    this.typingHandler = handlers.typing || null;
    this.readReceiptHandler = handlers.readReceipt || null;

    await this.subscriber.subscribe(NOTIFICATIONS_CHANNEL, (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage as string) as RedisPubSubMessage;

        if (parsed.sourceInstanceId === this.instanceId) {
          this.logger.info('Redis event ignored - originated from same instance', {
            notificationId: parsed.notificationId,
            receiverId: parsed.receiverId,
            instanceId: this.instanceId,
          });
          return;
        }

        this.logger.info('Redis event received', {
          notificationId: parsed.notificationId,
          receiverId: parsed.receiverId,
          sourceInstanceId: parsed.sourceInstanceId,
          instanceId: this.instanceId,
        });

        if (this.notificationHandler) {
          void this.notificationHandler(parsed);
        }
      } catch (error) {
        this.logger.error('Failed to process Redis pub/sub message', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
          rawMessage,
        });
      }
    });

    await this.subscriber.subscribe(TYPING_CHANNEL, (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage as string) as TypingPubSubMessage;

        if (parsed.sourceInstanceId === this.instanceId) {
          this.logger.info('Typing event ignored - originated from same instance', {
            senderId: parsed.senderId,
            receiverId: parsed.receiverId,
            instanceId: this.instanceId,
          });
          return;
        }

        this.logger.info('Typing event received', {
          senderId: parsed.senderId,
          receiverId: parsed.receiverId,
          sourceInstanceId: parsed.sourceInstanceId,
          instanceId: this.instanceId,
        });

        if (this.typingHandler) {
          void this.typingHandler(parsed);
        }
      } catch (error) {
        this.logger.error('Failed to process Redis typing event', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
          rawMessage,
        });
      }
    });

    await this.subscriber.subscribe(READ_RECEIPT_CHANNEL, (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage as string) as ReadReceiptPubSubMessage;

        if (parsed.sourceInstanceId === this.instanceId) {
          this.logger.info('Read receipt event ignored - originated from same instance', {
            notificationId: parsed.notificationId,
            senderId: parsed.senderId,
            instanceId: this.instanceId,
          });
          return;
        }

        this.logger.info('Read receipt event received', {
          notificationId: parsed.notificationId,
          senderId: parsed.senderId,
          sourceInstanceId: parsed.sourceInstanceId,
          instanceId: this.instanceId,
        });

        if (this.readReceiptHandler) {
          void this.readReceiptHandler(parsed);
        }
      } catch (error) {
        this.logger.error('Failed to process Redis read receipt event', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
          rawMessage,
        });
      }
    });

    this.isSubscribed = true;

    this.logger.info('Subscribed to Redis pub/sub channels', {
      instanceId: this.instanceId,
      channels: [NOTIFICATIONS_CHANNEL, TYPING_CHANNEL, READ_RECEIPT_CHANNEL],
    });
  }

  async publish(message: RedisPubSubMessage): Promise<void> {
    await this.publisher.publish(NOTIFICATIONS_CHANNEL, JSON.stringify(message));

    this.logger.info('Redis event published', {
      notificationId: message.notificationId,
      receiverId: message.receiverId,
      sourceInstanceId: message.sourceInstanceId,
      instanceId: this.instanceId,
      channel: NOTIFICATIONS_CHANNEL,
    });
  }

  async publishTyping(message: TypingPubSubMessage): Promise<void> {
    await this.publisher.publish(TYPING_CHANNEL, JSON.stringify(message));

    this.logger.info('Typing event published', {
      senderId: message.senderId,
      receiverId: message.receiverId,
      sourceInstanceId: message.sourceInstanceId,
      instanceId: this.instanceId,
      channel: TYPING_CHANNEL,
    });
  }

  async publishReadReceipt(message: ReadReceiptPubSubMessage): Promise<void> {
    await this.publisher.publish(READ_RECEIPT_CHANNEL, JSON.stringify(message));

    this.logger.info('Read receipt event published', {
      notificationId: message.notificationId,
      senderId: message.senderId,
      sourceInstanceId: message.sourceInstanceId,
      instanceId: this.instanceId,
      channel: READ_RECEIPT_CHANNEL,
    });
  }

  async disconnect(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(NOTIFICATIONS_CHANNEL);
      await this.subscriber.unsubscribe(TYPING_CHANNEL);
      await this.subscriber.unsubscribe(READ_RECEIPT_CHANNEL);
    } catch (error) {
      this.logger.warn('Error unsubscribing from Redis channels', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      await this.subscriber.quit();
    } catch (error) {
      this.logger.warn('Error quitting Redis subscriber', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      await this.publisher.quit();
    } catch (error) {
      this.logger.warn('Error quitting Redis publisher', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    this.logger.info('Redis pub/sub disconnected', {
      instanceId: this.instanceId,
    });
  }
}
