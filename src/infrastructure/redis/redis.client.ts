import { createClient, RedisClientType } from 'redis';
import { Env } from '../config/env';
import { Logger } from 'winston';

export const createRedisClient = (
  env: Env,
  logger: Logger,
  clientName: 'publisher' | 'subscriber'
): RedisClientType => {
  const url = env.REDIS_URL ? env.REDIS_URL : `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;

  const client = createClient({
    url,
    name: `${env.INSTANCE_ID}-${clientName}`,
  });

  client.on('connect', () => {
    logger.info(`Redis ${clientName} client connecting`, {
      instanceId: env.INSTANCE_ID,
      client: clientName,
      url,
    });
  });

  client.on('ready', () => {
    logger.info(`Redis ${clientName} client connected`, {
      instanceId: env.INSTANCE_ID,
      client: clientName,
      url,
    });
  });

  client.on('error', (error: Error) => {
    logger.error(`Redis ${clientName} client error`, {
      instanceId: env.INSTANCE_ID,
      client: clientName,
      error: error.message,
    });
  });

  client.on('end', () => {
    logger.info(`Redis ${clientName} client disconnected`, {
      instanceId: env.INSTANCE_ID,
      client: clientName,
    });
  });

  client.on('reconnecting', () => {
    logger.info(`Redis ${clientName} client reconnecting`, {
      instanceId: env.INSTANCE_ID,
      client: clientName,
    });
  });

  return client as RedisClientType;
};
