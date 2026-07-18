import { RedisClientType } from 'redis';
import { Logger } from 'winston';

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

export type NotificationPubSubHandler = (message: RedisPubSubMessage) => void | Promise<void>;

const NOTIFICATIONS_CHANNEL = 'notifications';

export class RedisPubSub {
  private readonly publisher: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly logger: Logger;
  private readonly instanceId: string;
  private isSubscribed = false;

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

  async subscribe(handler: NotificationPubSubHandler): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

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

        void handler(parsed);
      } catch (error) {
        this.logger.error('Failed to process Redis pub/sub message', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
          rawMessage,
        });
      }
    });

    this.isSubscribed = true;

    this.logger.info('Subscribed to Redis notifications channel', {
      instanceId: this.instanceId,
      channel: NOTIFICATIONS_CHANNEL,
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

  async disconnect(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(NOTIFICATIONS_CHANNEL);
    } catch (error) {
      this.logger.warn('Error unsubscribing from Redis channel', {
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
