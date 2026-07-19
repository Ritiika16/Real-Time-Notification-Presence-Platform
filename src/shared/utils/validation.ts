import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Invalid email address');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const createNotificationSchema = z.object({
  receiverId: z.string().uuid('Invalid receiver ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must not exceed 2000 characters'),
  type: z.enum(['INFO', 'MESSAGE', 'ALERT', 'SYSTEM'], {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
});

export const markAsReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .or(z.number())
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1, 'Page must be at least 1'))
    .default('1'),
  limit: z
    .string()
    .or(z.number())
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit must not exceed 100'))
    .default('20'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
