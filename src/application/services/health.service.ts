import { prisma } from '../../infrastructure/database/prisma';
import { Logger } from 'winston';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version?: string;
  dependencies?: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
    redis?: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
  };
}

export class HealthService {
  constructor(private readonly logger: Logger) {}

  async getHealth(): Promise<HealthCheckResult> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'unknown',
      version: process.env['npm_package_version'] || '1.0.0',
    };
  }

  async getLiveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const dependencies: HealthCheckResult['dependencies'] = {
      database: {
        status: 'unhealthy',
      },
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - startTime;
      dependencies.database = {
        status: 'healthy',
        latency: dbLatency,
      };
    } catch (error) {
      this.logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      dependencies.database.status = 'unhealthy';
    }

    const allHealthy = Object.values(dependencies).every((dep) => dep.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'unknown',
      dependencies,
    };
  }
}