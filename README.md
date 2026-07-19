# Distributed Real-Time Notification & Presence Platform

A production-grade, distributed notification platform with real-time Socket.IO communication, multi-instance support, Redis Pub/Sub synchronization, and comprehensive observability features.

## 🎯 Problem Statement

Building scalable real-time notification systems presents several challenges:
- **Multi-instance synchronization**: Real-time events must be delivered across multiple Node.js instances
- **Presence management**: Tracking user online/offline status across distributed systems
- **Load balancing**: Distributing traffic while maintaining WebSocket connections
- **Observability**: Monitoring system health and performance in production
- **Data consistency**: Ensuring notification delivery and read receipts work correctly

This platform provides a complete, production-ready solution addressing all these challenges.

## ✨ Key Features

- **Authentication**: JWT-based user registration and login with secure password hashing
- **Real-time Communication**: Socket.IO with JWT authentication for WebSocket connections
- **Presence Tracking**: Real-time online/offline user status with multi-socket support
- **Notifications**: Create, deliver, and track notifications with persistence in PostgreSQL
- **Multi-instance Support**: Redis Pub/Sub for cross-instance event synchronization
- **Load Balancing**: Nginx with least-connection algorithm for traffic distribution
- **Typing Indicators**: Real-time typing status across instances
- **Read Receipts**: Notification read status with sender notification
- **Reconnection Handling**: Automatic Socket.IO reconnection with JWT re-authentication
- **Offline Recovery**: Automatic notification sync when users reconnect
- **Health Monitoring**: Comprehensive health checks for liveness and readiness
- **Metrics**: Prometheus-compatible metrics for monitoring and alerting
- **API Documentation**: Complete Swagger/OpenAPI documentation
- **Clean Architecture**: Separation of concerns with maintainable code structure

## 🏗️ Architecture Overview

```mermaid
graph TB
    Clients[Clients - Web/Mobile]
    Nginx[Nginx Load Balancer]
    App1[Node Instance 1 - Port 3000]
    App2[Node Instance 2 - Port 3001]
    Redis[(Redis Pub/Sub)]
    Postgres[(PostgreSQL Database)]
    Presence[Presence Manager]
    Notification[Notification Service]
    Typing[Typing Service]
    Metrics[Metrics Service]
    
    Clients -->|HTTP/WebSocket| Nginx
    Nginx -->|Load Balance| App1
    Nginx -->|Load Balance| App2
    
    App1 -->|Subscribe/Publish| Redis
    App2 -->|Subscribe/Publish| Redis
    
    App1 -->|CRUD Operations| Postgres
    App2 -->|CRUD Operations| Postgres
    
    subgraph "Instance 1 Components"
        App1 --> Presence
        App1 --> Notification
        App1 --> Typing
        App1 --> Metrics
    end
    
    subgraph "Instance 2 Components"
        App2 --> Presence
        App2 --> Notification
        App2 --> Typing
        App2 --> Metrics
    end
    
    Redis -.->|Sync Events| App1
    Redis -.->|Sync Events| App2
    
    style Clients fill:#e1f5ff
    style Nginx fill:#fff4e1
    style App1 fill:#e8f5e9
    style App2 fill:#e8f5e9
    style Redis fill:#fce4ec
    style Postgres fill:#f3e5f5
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.1+
- **Web Framework**: Express.js
- **Real-time**: Socket.IO 4.8+
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache/Messaging**: Redis 7 with Pub/Sub
- **Load Balancer**: Nginx (Docker Compose)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod schemas
- **Logging**: Winston with structured logging
- **Documentation**: Swagger/OpenAPI 3.0
- **Metrics**: Prometheus-compatible with prom-client
- **Containerization**: Docker with multi-stage builds
- **Testing**: Jest with ts-jest

### Project Structure

```
src/
├── api/                           # API Layer
│   ├── controllers/               # Request handlers
│   │   ├── auth.controller.ts     # Authentication endpoints
│   │   ├── notification.controller.ts
│   │   ├── health.controller.ts   # Health check endpoints
│   │   ├── metrics.controller.ts  # Metrics endpoints
│   │   └── users.controller.ts    # User endpoints
│   ├── middlewares/               # Express middlewares
│   │   └── auth.middleware.ts     # JWT authentication
│   └── routes/                    # API route definitions
│       ├── auth.routes.ts
│       ├── notification.routes.ts
│       ├── health.routes.ts
│       ├── metrics.routes.ts
│       └── users.routes.ts
├── application/                   # Application Layer
│   └── services/                  # Business logic
│       ├── auth.service.ts        # Authentication logic
│       ├── health.service.ts      # Health check logic
│       ├── metrics.service.ts     # Metrics collection
│       ├── notification.service.ts # Notification logic
│       └── typing.service.ts      # Typing indicator logic
├── infrastructure/                # Infrastructure Layer
│   ├── auth/                      # Authentication infrastructure
│   │   ├── jwt.ts                # JWT utilities
│   │   └── password.ts           # Password hashing
│   ├── config/                    # Configuration
│   │   ├── env.ts                # Environment validation
│   │   └── swagger.ts            # Swagger configuration
│   ├── database/                  # Database
│   │   └── prisma.ts             # Prisma client
│   ├── logger/                    # Logging
│   │   └── logger.ts             # Winston configuration
│   ├── redis/                     # Redis
│   │   ├── redis.client.ts        # Redis client factory
│   │   └── redis.pubsub.ts        # Pub/Sub abstraction
│   └── repositories/              # Data access
│       └── notification.repository.ts
├── realtime/                      # Real-time Layer
│   ├── handlers/                  # Socket.IO event handlers
│   │   ├── notification.handler.ts
│   │   ├── presence.handler.ts
│   │   └── typing.handler.ts
│   ├── middlewares/               # Socket.IO middlewares
│   │   └── socket.auth.middleware.ts
│   ├── presence.manager.ts        # Presence tracking
│   └── socket.ts                 # Socket.IO initialization
├── shared/                        # Shared Layer
│   ├── types/                     # Type definitions
│   │   ├── notification.types.ts
│   │   ├── read-receipt.types.ts
│   │   └── typing.types.ts
│   └── utils/                     # Shared utilities
│       └── validation.ts          # Zod schemas
└── tests/                         # Test files
    └── notification.service.test.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)
- Docker & Docker Compose (for containerized deployment)

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd WhatsApp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
INSTANCE_ID=default
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/notification_platform
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-minimum-32-characters
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost
```

4. **Set up PostgreSQL**
```bash
# Using Docker
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=notification_platform \
  postgres:15-alpine

# Or use local PostgreSQL
# Create database: notification_platform
```

5. **Set up Redis**
```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or use local Redis
redis-server
```

6. **Run database migrations**
```bash
npx prisma migrate dev
```

7. **Start the development server**
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Configure environment variables**
```bash
cp .env.example .env.docker
```

Edit `.env.docker`:
```env
POSTGRES_PASSWORD=your-secure-postgres-password
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
ALLOWED_ORIGINS=http://localhost
```

2. **Start the complete stack**
```bash
docker-compose up --build
```

This will start:
- Nginx load balancer on port 80
- Two Node.js application instances (ports 3000, 3001)
- PostgreSQL database on port 5432
- Redis on port 6379

3. **Access the application**
- API: `http://localhost`
- Swagger Docs: `http://localhost/api-docs`
- Health Check: `http://localhost/health`
- Metrics: `http://localhost/metrics`

4. **Stop the stack**
```bash
docker-compose down
```

### Manual Docker Build

```bash
# Build the Docker image
docker build -t notification-platform .

# Run a single instance
docker run -d \
  -p 3000:3000 \
  -e PORT=3000 \
  -e INSTANCE_ID=server-1 \
  -e DATABASE_URL=postgresql://user:password@host:5432/notification_platform \
  -e JWT_SECRET=your-jwt-secret \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  notification-platform
```

## 🔄 Running Multiple Instances

### Local Development

**Terminal 1 - Instance 1:**
```bash
npm run dev:1
```

**Terminal 2 - Instance 2:**
```bash
npm run dev:2
```

### Production Build

```bash
npm run build

# Terminal 1
npm run start:1

# Terminal 2
npm run start:2
```

## 📡 API Documentation

### Swagger UI
Access interactive API documentation at:
```
http://localhost:3000/api-docs
```

### REST API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user profile (requires JWT)

#### Users
- `GET /api/v1/users/online` - Get list of online users

#### Notifications
- `POST /api/v1/notifications` - Create notification (requires JWT)
- `GET /api/v1/notifications?page=1&limit=20` - Get user's notifications (requires JWT)
- `GET /api/v1/notifications/unread/count` - Get unread notification count (requires JWT)
- `PATCH /api/v1/notifications/:notificationId/read` - Mark notification as read (requires JWT)
- `PATCH /api/v1/notifications/read-all` - Mark all notifications as read (requires JWT)

#### Health & Observability
- `GET /health` - Overall application health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe with dependency checks
- `GET /metrics` - Prometheus-compatible metrics

### Example API Requests

#### Register User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password@123",
    "fullName": "John Doe"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password@123"
  }'
```

#### Create Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "receiverId": "user-id",
    "title": "Hello",
    "message": "Test notification",
    "type": "MESSAGE"
  }'
```

#### Get Notifications
```bash
curl -X GET http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔌 Socket.IO Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### Client → Server Events

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing:start', { receiverId: 'user-id' });

// Stop typing
socket.emit('typing:stop', { receiverId: 'user-id' });
```

#### Read Receipts
```javascript
socket.emit('notification:read', { notificationId: 'notification-id' });
```

### Server → Client Events

#### Presence
```javascript
socket.on('user:online', (data) => {
  console.log('User came online:', data.userId);
});

socket.on('user:offline', (data) => {
  console.log('User went offline:', data.userId);
});
```

#### Notifications
```javascript
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

socket.on('notification:read:success', (data) => {
  console.log('Notification marked as read:', data);
});

socket.on('notification:read', (data) => {
  console.log('Read receipt received:', data);
});
```

#### Typing Indicators
```javascript
socket.on('user:typing', (data) => {
  console.log('User typing status:', data.userId, data.isTyping);
});
```

## 📨 Redis Pub/Sub Channels

The system uses Redis Pub/Sub for cross-instance synchronization:

- **notifications**: Notification delivery across instances
- **typing**: Typing indicator synchronization
- **read-receipts**: Read receipt delivery across instances

Each message includes a `sourceInstanceId` to prevent duplicate delivery.

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Manual Testing Checklist

#### Authentication
- [ ] Register new user
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Access protected endpoint without JWT (should fail)
- [ ] Access protected endpoint with expired JWT (should fail)

#### Socket.IO
- [ ] Connect with valid JWT token
- [ ] Connect without JWT token (should fail)
- [ ] Disconnect and reconnect automatically
- [ ] Handle multiple sockets per user

#### Presence
- [ ] User comes online
- [ ] User goes offline
- [ ] Multiple sockets for same user
- [ ] Online user listing
- [ ] Cross-instance presence sync

#### Notifications
- [ ] Send notification to online user
- [ ] Send notification to offline user
- [ ] Notification persistence
- [ ] Notification delivery
- [ ] Notification history with pagination
- [ ] Unread notification count
- [ ] Mark notification as read
- [ ] Mark all notifications as read
- [ ] Notification sync after reconnection

#### Typing Indicators
- [ ] Send typing:start event
- [ ] Send typing:stop event
- [ ] Receive typing indicators
- [ ] Cross-instance typing sync

#### Read Receipts
- [ ] Send read receipt
- [ ] Receive read receipt as sender
- [ ] Verify read status persistence
- [ ] Cross-instance read receipt sync

#### Redis Pub/Sub
- [ ] Messages published by one instance
- [ ] Messages received by another instance
- [ ] Duplicate prevention
- [ ] Notification cross-instance delivery
- [ ] Typing cross-instance sync
- [ ] Read receipt cross-instance sync

#### Load Balancing
- [ ] Nginx routes to both instances
- [ ] WebSocket connections work through Nginx
- [ ] Cross-instance synchronization works

#### Observability
- [ ] Swagger UI accessible
- [ ] Health endpoint responds
- [ ] Liveness probe responds
- [ ] Readiness probe checks dependencies
- [ ] Metrics endpoint returns Prometheus format
- [ ] Structured logs generated correctly

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server (port 3000)
npm run dev:1            # Start instance 1 (port 3000)
npm run dev:2            # Start instance 2 (port 3001)

# Production
npm run build            # Build TypeScript
npm start                # Start production server
npm run start:1          # Start instance 1 (port 3000)
npm run start:2          # Start instance 2 (port 3001)

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run typecheck        # Type check without emitting

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Database
npx prisma migrate dev    # Run migrations
npx prisma studio        # Open Prisma Studio
npx prisma generate      # Generate Prisma Client
```

## 🔧 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `INSTANCE_ID` | Unique instance identifier for Redis Pub/Sub | default | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - | Yes |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 | No |
| `REDIS_HOST` | Redis host | localhost | No |
| `REDIS_PORT` | Redis port | 6379 | No |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | info | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | http://localhost | No |

## 🔐 Security Considerations

- **JWT Authentication**: All API endpoints and Socket.IO connections require valid JWT tokens
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **CORS**: Configurable CORS for cross-origin requests
- **Rate Limiting**: Nginx rate limiting for API endpoints
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: Built-in XSS protection with Helmet
- **No Secrets in Logs**: Sensitive data never logged
- **Environment Variables**: Secrets managed via environment variables

## 📊 Monitoring & Observability

### Health Checks
- **Liveness**: `GET /health/live` - Always returns 200 if process is running
- **Readiness**: `GET /health/ready` - Returns 200 if dependencies are healthy, 503 otherwise
- **Overall**: `GET /health` - Returns system status with uptime and environment

### Metrics
The system exposes Prometheus-compatible metrics at `GET /metrics`:

- `http_request_duration_seconds` - HTTP request duration histogram
- `http_requests_total` - Total HTTP request count
- `http_errors_total` - HTTP error count
- `socket_connections_active` - Active Socket.IO connections
- `notifications_created_total` - Total notifications created
- `notifications_delivered_total` - Notifications delivered in real-time
- `notifications_stored_offline_total` - Notifications stored for offline users
- `redis_pubsub_messages_total` - Redis Pub/Sub messages processed
- Default Node.js metrics (CPU, memory, event loop lag)

### Logging
Structured logging with Winston:
- JSON format in production
- Human-readable format in development
- Multiple log levels (error, warn, info, debug)
- Instance-aware logging for multi-instance setups
- File logging in production with rotation

## 🚨 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Change PORT in .env or kill the process using the port
netstat -ano | findstr :3000
```

**PostgreSQL connection failed**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres
# Check connection string in .env
```

**Redis connection failed**
```bash
# Verify Redis is running
docker ps | grep redis
# Check Redis configuration in .env
```

**Socket.IO connection issues**
```bash
# Verify JWT token is valid and not expired
# Check CORS configuration
# Verify Socket.IO client version matches server version
```

**Docker Compose issues**
```bash
# Rebuild containers
docker-compose down
docker-compose up --build

# Check logs
docker-compose logs app-1
docker-compose logs nginx
```

**Multi-instance synchronization not working**
```bash
# Verify Redis Pub/Sub is working
# Check INSTANCE_ID is unique per instance
# Verify Redis connection in logs
```

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for detailed logging.

## 📈 Production Considerations

### Scaling
- Horizontal scaling: Add more app instances to docker-compose.yml
- Load balancing: Nginx automatically distributes traffic
- Database: Consider managed PostgreSQL service for production
- Redis: Consider managed Redis service for production

### Performance
- Use production build (`npm run build`)
- Enable Nginx caching for static content
- Configure connection pooling for PostgreSQL
- Monitor metrics and scale based on load
- Consider CDN for static assets

### Security
- Use strong JWT secrets (minimum 32 characters)
- Enable HTTPS in production
- Configure proper CORS origins
- Use environment-specific secrets
- Regular security updates
- Implement rate limiting per user
- Add API key authentication for metrics endpoint

### High Availability
- Use managed PostgreSQL with automatic failover
- Use Redis Cluster for high availability
- Configure Nginx health checks
- Implement graceful shutdown
- Use container orchestration (Kubernetes) for production

## 📝 License

MIT

## 🤝 Contributing

This is a demonstration project for educational purposes. For production use, ensure you:
- Review and enhance security measures
- Implement proper error monitoring
- Add comprehensive integration tests
- Set up CI/CD pipelines
- Configure production-grade monitoring
- Implement backup and disaster recovery

## 📧 Support

For issues and questions, please refer to the testing documentation files:
- `MULTI_INSTANCE_TESTING.md` - Multi-instance setup guide
- `REDIS_PUBSUB_TESTING.md` - Redis Pub/Sub testing guide
- `SOCKET_IO_TESTING.md` - Socket.IO testing guide
- `TESTING_GUIDE.md` - General testing instructions