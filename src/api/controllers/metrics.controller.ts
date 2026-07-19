import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../application/services/metrics.service';

export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();
      res.set('Content-Type', this.metricsService.getContentType());
      res.status(200).send(metrics);
    } catch (error) {
      next(error);
    }
  }
}