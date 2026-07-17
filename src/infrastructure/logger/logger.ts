import winston from 'winston';
import { Env } from '../config/env';

const createLogger = (env: Env): winston.Logger => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      ({ timestamp, level, message, ...metadata }: winston.Logform.TransformableInfo) => {
        const msg = `${String(timestamp)} [${String(level)}]: ${String(message)}`;
        if (Object.keys(metadata).length > 0) {
          return `${msg} ${JSON.stringify(metadata)}`;
        }
        return msg;
      }
    )
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ];

  if (env.NODE_ENV === 'production') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: logFormat,
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: env.LOG_LEVEL,
    format: logFormat,
    transports,
    exitOnError: false,
  });
};

export { createLogger };
