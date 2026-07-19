import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller';

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get Prometheus-compatible metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */

export const createMetricsRoutes = (metricsService: import('../../application/services/metrics.service').MetricsService): Router => {
  const router = Router();
  const metricsController = new MetricsController(metricsService);

  router.get('/', (req, res, next) => {
    void metricsController.getMetrics(req, res, next);
  });

  return router;
};