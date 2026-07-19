import client from 'prom-client';

export class MetricsService {
  private static instance: MetricsService;
  private httpRequestDuration: client.Histogram<string>;
  private httpRequestCount: client.Counter<string>;
  private httpErrors: client.Counter<string>;
  private socketConnections: client.Gauge<string>;
  private notificationsCreated: client.Counter<string>;
  private notificationsDelivered: client.Counter<string>;
  private notificationsStoredOffline: client.Counter<string>;
  private redisPubSubMessages: client.Counter<string>;

  private constructor() {
    const register = client.register;

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestCount = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpErrors = new client.Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.socketConnections = new client.Gauge({
      name: 'socket_connections_active',
      help: 'Number of active Socket.IO connections',
      registers: [register],
    });

    this.notificationsCreated = new client.Counter({
      name: 'notifications_created_total',
      help: 'Total number of notifications created',
      registers: [register],
    });

    this.notificationsDelivered = new client.Counter({
      name: 'notifications_delivered_total',
      help: 'Total number of notifications delivered in real-time',
      registers: [register],
    });

    this.notificationsStoredOffline = new client.Counter({
      name: 'notifications_stored_offline_total',
      help: 'Total number of notifications stored for offline users',
      registers: [register],
    });

    this.redisPubSubMessages = new client.Counter({
      name: 'redis_pubsub_messages_total',
      help: 'Total number of Redis Pub/Sub messages processed',
      labelNames: ['message_type'],
      registers: [register],
    });

    // Default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register });
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    this.httpRequestCount.inc({ method, route, status_code: statusCode.toString() });

    if (statusCode >= 400) {
      this.httpErrors.inc({ method, route, status_code: statusCode.toString() });
    }
  }

  setSocketConnections(count: number): void {
    this.socketConnections.set(count);
  }

  incrementNotificationsCreated(): void {
    this.notificationsCreated.inc();
  }

  incrementNotificationsDelivered(): void {
    this.notificationsDelivered.inc();
  }

  incrementNotificationsStoredOffline(): void {
    this.notificationsStoredOffline.inc();
  }

  incrementRedisPubSubMessage(messageType: string): void {
    this.redisPubSubMessages.inc({ message_type: messageType });
  }

  async getMetrics(): Promise<string> {
    return await client.register.metrics();
  }

  getContentType(): string {
    return client.register.contentType;
  }
}