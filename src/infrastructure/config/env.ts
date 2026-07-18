import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PORT: z
      .string()
      .transform((val: string) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535))
      .default('3000'),

    INSTANCE_ID: z.string().min(1).default('default'),

    DATABASE_URL: z.string().url(),

    JWT_SECRET: z.string().min(32),

    JWT_REFRESH_SECRET: z.string().min(32),

    REDIS_URL: z.string().url().optional(),

    REDIS_HOST: z.string().min(1).optional(),

    REDIS_PORT: z
      .string()
      .transform((val: string) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535))
      .optional(),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  })
  .refine((data) => data.REDIS_URL || (data.REDIS_HOST && data.REDIS_PORT), {
    message: 'Either REDIS_URL or both REDIS_HOST and REDIS_PORT must be provided',
    path: ['REDIS_URL'],
  });

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
  const env = {
    NODE_ENV: process.env['NODE_ENV'],
    PORT: process.env['PORT'],
    INSTANCE_ID: process.env['INSTANCE_ID'],
    DATABASE_URL: process.env['DATABASE_URL'],
    JWT_SECRET: process.env['JWT_SECRET'],
    JWT_REFRESH_SECRET: process.env['JWT_REFRESH_SECRET'],
    REDIS_URL: process.env['REDIS_URL'],
    REDIS_HOST: process.env['REDIS_HOST'],
    REDIS_PORT: process.env['REDIS_PORT'],
    LOG_LEVEL: process.env['LOG_LEVEL'],
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);

      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }

    throw error;
  }
};
