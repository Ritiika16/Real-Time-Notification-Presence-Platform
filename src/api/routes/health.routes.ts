import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get overall application health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 version:
 *                   type: string
 */

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe - confirms the process is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Process is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe - verifies critical dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All dependencies are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy]
 *                         latency:
 *                           type: number
 *       503:
 *         description: One or more dependencies are unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [unhealthy]
 */

export const createHealthRoutes = (healthService: import('../../application/services/health.service').HealthService): Router => {
  const router = Router();
  const healthController = new HealthController(healthService);

  router.get('/', (req, res, next) => {
    void healthController.getHealth(req, res, next);
  });

  router.get('/live', (req, res, next) => {
    void healthController.getLiveness(req, res, next);
  });

  router.get('/ready', (req, res, next) => {
    void healthController.getReadiness(req, res, next);
  });

  return router;
};