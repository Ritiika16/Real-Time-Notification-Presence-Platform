import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { registerSchema, loginSchema } from '../../shared/utils/validation';
import { Logger } from 'winston';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        this.logger.warn('Registration validation failed', {
          errors: validationResult.error.errors,
        });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.authService.register(validationResult.data);

      this.logger.info('User registered successfully', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        this.logger.warn('Registration attempt with existing email', {
          email: req.body.email,
        });
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      this.logger.error('Registration error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = loginSchema.safeParse(req.body);

      if (!validationResult.success) {
        this.logger.warn('Login validation failed', {
          errors: validationResult.error.errors,
        });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.authService.login(validationResult.data);

      this.logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        this.logger.warn('Login attempt with invalid credentials', {
          email: req.body.email,
        });
        res.status(401).json({
          success: false,
          error: error.message,
        });
        return;
      }
      this.logger.error('Login error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as Request & { user?: { userId: string } }).user?.userId;

      if (!userId) {
        this.logger.warn('GetMe request without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const user = await this.authService.getUserById(userId);

      this.logger.info('User profile retrieved', {
        userId: user.id,
      });

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        this.logger.warn('User not found in getMe', {
          userId: (req as Request & { user?: { userId: string } }).user?.userId,
        });
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      this.logger.error('GetMe error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
