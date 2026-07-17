# Distributed Real-Time Notification & Presence Platform

A production-ready backend foundation for building scalable real-time notification systems using WebSocket connections across multiple Node.js instances.

## Tech Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express** - Web framework
- **Socket.IO** - WebSocket library (dependency only)
- **Redis** - Pub/Sub for distributed messaging (dependency only)
- **PostgreSQL** - Database (dependency only)
- **Prisma ORM** - Database ORM (dependency only)
- **JWT** - Authentication (dependency only)
- **Docker** - Containerization
- **Winston** - Structured logging
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Compression** - Response compression
- **Morgan** - HTTP request logging
- **dotenv** - Environment variable management
- **Zod** - Schema validation
- **Swagger** - API documentation (dependency only)

## Project Structure

```
src/
├── api/
│   ├── controllers/       # Route controllers
│   ├── routes/           # API routes
│   └── middlewares/      # Express middlewares
├── socket/
│   └── events/          # Socket.IO event handlers
├── application/
│   └── services/        # Business logic services
├── core/
│   ├── entities/        # Domain entities
│   └── repositories/    # Repository interfaces
├── infrastructure/
│   ├── database/        # Database implementations
│   ├── redis/           # Redis implementations
│   ├── logger/          # Winston logger configuration
│   └── config/          # Environment configuration
├── shared/
│   └── utils/           # Shared utilities
└── tests/               # Test files
```

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/notification_platform
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=info
```

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Docker

### Build and run with Docker Compose

```bash
docker-compose up --build
```

## Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run typecheck` - Type check TypeScript without emitting

## Features

- **Strict TypeScript** - No `any` types, full type safety
- **Environment Validation** - Zod-based schema validation
- **Structured Logging** - Winston with multiple transports
- **Security** - Helmet, CORS, compression
- **Health Endpoint** - `/health` for monitoring
- **Graceful Shutdown** - Proper cleanup on SIGTERM/SIGINT
- **Error Handling** - Global error handler with logging
- **Clean Architecture** - Separation of concerns
- **Docker Support** - Multi-stage Dockerfile with docker-compose

## Health Check

```bash
curl http://localhost:3000/health
```

## License

MIT
