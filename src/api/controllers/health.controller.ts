import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../../application/services/health.service';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.healthService.getHealth();
      res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  }

  async getLiveness(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const liveness = await this.healthService.getLiveness();
      res.status(200).json(liveness);
    } catch (error) {
      next(error);
    }
  }

  async getReadiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const readiness = await this.healthService.getReadiness();
      const statusCode = readiness.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(readiness);
    } catch (error) {
      next(error);
    }
  }
}