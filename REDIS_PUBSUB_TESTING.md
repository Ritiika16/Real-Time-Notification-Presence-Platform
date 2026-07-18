# Redis Pub/Sub Integration - Testing Guide

This guide explains how to test the Redis Pub/Sub integration that enables real-time notification delivery across multiple Node.js server instances.

---

## Architecture

```
Client A (Ram)
    ↓
Server Instance 1 (PORT=3000, INSTANCE_ID=server-1)
    ↓
PostgreSQL (persist notification)
    ↓
Redis Publisher
    ↓
Redis Channel: notifications
    ↓
Redis Subscriber
    ↓
Server Instance 2 (PORT=3001, INSTANCE_ID=server-2)
    ↓
Socket.IO
    ↓
Client B (Siya)
```

## What Was Implemented

### 1. Redis Infrastructure

- `src/infrastructure/redis/redis.client.ts`
  - Factory for creating Redis publisher and subscriber clients
  - Separate connections for publish and subscribe operations
  - Connection lifecycle event logging

- `src/infrastructure/redis/redis.pubsub.ts`
  - `RedisPubSub` abstraction for publishing and subscribing
  - Channel: `notifications`
  - Deduplication using `sourceInstanceId`

### 2. Environment Variables

```
PORT=3000
INSTANCE_ID=server-1
REDIS_URL=redis://localhost:6379
# or
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Notification Flow

When a notification is created:

1. Persisted in PostgreSQL
2. If receiver is connected locally → emit `notification:new` directly
3. If receiver is not connected locally → publish to Redis
4. Other instances subscribe to Redis channel
5. Receiving instance checks if receiver is connected locally
6. If yes → emit `notification:new` and mark as delivered
7. If no → ignore (notification remains in database for later sync)

### 4. Duplicate Prevention

Every Redis message includes `sourceInstanceId`. A server ignores messages that originated from itself, preventing duplicate delivery.

---

## Prerequisites

- PostgreSQL running
- Redis server running on `localhost:6379`
- Project dependencies installed (`npm install`)

### Start Redis

If you have Redis installed locally:

```bash
redis-server
```

Or using Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

## Start Multiple Server Instances

Open two terminals.

### Terminal 1 - Server Instance 1

```bash
npm run dev:1
```

This runs:
```
set PORT=3000
set INSTANCE_ID=server-1
ts-node-dev --respawn --transpile-only src/index.ts
```

**Expected Log:**
```
2024-01-01 12:00:00 [Server-3000] [info]: Server is running on port 3000 in development mode
2024-01-01 12:00:00 [Server-3000] [info]: Redis publisher client connected { instanceId: "server-1", client: "publisher", url: "redis://localhost:6379" }
2024-01-01 12:00:00 [Server-3000] [info]: Redis subscriber client connected { instanceId: "server-1", client: "subscriber", url: "redis://localhost:6379" }
2024-01-01 12:00:00 [Server-3000] [info]: Subscribed to Redis notifications channel { instanceId: "server-1", channel: "notifications" }
```

### Terminal 2 - Server Instance 2

```bash
npm run dev:2
```

This runs:
```
set PORT=3001
set INSTANCE_ID=server-2
ts-node-dev --respawn --transpile-only src/index.ts
```

**Expected Log:**
```
2024-01-01 12:00:01 [Server-3001] [info]: Server is running on port 3001 in development mode
2024-01-01 12:00:01 [Server-3001] [info]: Redis subscriber client connected { instanceId: "server-2", client: "subscriber", url: "redis://localhost:6379" }
2024-01-01 12:00:01 [Server-3001] [info]: Subscribed to Redis notifications channel { instanceId: "server-2", channel: "notifications" }
```

---

## Test 1: Single Instance Notification

Verify Redis does not interfere with single-instance delivery.

### Steps

1. Start only Server 1 (`npm run dev:1`)
2. Open browser console and connect Ram and Siya to `http://localhost:3000`
3. Use REST API to send a notification from Ram to Siya

```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "Single Instance Test",
  "message": "Testing direct delivery",
  "type": "MESSAGE"
}'
```

### Expected Result

- Siya receives `notification:new` event
- Server 1 log shows:
```
[Server-3000] [info]: Notification delivered to online user { notificationId: "...", receiverId: "...", socketCount: 1 }
```
- Redis event published but ignored because Siya is local (the publish still happens because local delivery doesn't trigger Redis - actually it's only published if not local)

Wait - correction: if receiver is local, it emits directly and does NOT publish to Redis. So log will show direct delivery only.

---

## Test 2: Cross-Instance Notification Delivery

This is the main test for Redis Pub/Sub.

### Setup

1. Start both servers:
   - Terminal 1: `npm run dev:1` (port 3000)
   - Terminal 2: `npm run dev:2` (port 3001)

2. Open two browser windows
3. Connect Ram to Server 1 (port 3000)
4. Connect Siya to Server 2 (port 3001)

```javascript
// Ram's browser - connect to Server 1
const ramSocket = io('http://localhost:3000', {
  auth: { token: 'RAM_TOKEN' }
});

ramSocket.on('connect', () => {
  console.log('Ram connected to Server 3000');
});
```

```javascript
// Siya's browser - connect to Server 2
const siyaSocket = io('http://localhost:3001', {
  auth: { token: 'SIYA_TOKEN' }
});

siyaSocket.on('connect', () => {
  console.log('Siya connected to Server 3001');
});

siyaSocket.on('notification:new', (data) => {
  console.log('Siya received notification:', data);
});
```

### Execute

Send notification from Ram to Siya via Server 1:

```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "Cross-Instance Test",
  "message": "Ram sent this from Server 1 to Siya on Server 2",
  "type": "MESSAGE"
}'
```

### Expected Flow

**Server 1 Log:**
```
[Server-3000] [info]: Notification created and stored
[Server-3000] [info]: Redis event published { notificationId: "...", receiverId: "SIYA_USER_ID", sourceInstanceId: "server-1", instanceId: "server-1" }
```

**Server 2 Log:**
```
[Server-3001] [info]: Redis event received { notificationId: "...", receiverId: "SIYA_USER_ID", sourceInstanceId: "server-1", instanceId: "server-2" }
[Server-3001] [info]: Notification delivered through Redis { notificationId: "...", receiverId: "SIYA_USER_ID", socketCount: 1, instanceId: "server-2" }
```

**Siya's Browser Console:**
```javascript
Siya received notification: {
  id: "...",
  senderId: "RAM_USER_ID",
  senderEmail: "ram@example.com",
  senderName: "Ram",
  title: "Cross-Instance Test",
  message: "Ram sent this from Server 1 to Siya on Server 2",
  type: "MESSAGE",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### Verification

- [ ] Siya receives exactly one `notification:new` event
- [ ] Notification status is `DELIVERED` in database
- [ ] Server 1 published to Redis
- [ ] Server 2 received from Redis and delivered locally
- [ ] No duplicate delivery

---

## Test 3: Duplicate Prevention

Verify the same notification is not delivered twice.

### Steps

1. Connect Siya to both Server 1 and Server 2 (same user, two sockets)
2. Send a notification to Siya from Server 1
3. Redis publishes the message
4. Both Server 1 and Server 2 receive the Redis message
5. Server 1 ignores it (sourceInstanceId matches)
6. Server 2 delivers it to Siya's socket on Server 2

### Expected Result

- Siya receives the notification exactly once through the socket that is connected to Server 2
- Server 1 log shows:
```
[Server-3000] [info]: Redis event ignored - originated from same instance { notificationId: "...", receiverId: "..." }
```

---

## Test 4: Offline Receiver

Verify notifications are persisted and delivered later.

### Steps

1. Keep Ram online on Server 1
2. Keep Siya offline
3. Send notification from Ram to Siya

```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "Offline Test",
  "message": "This should be stored",
  "type": "ALERT"
}'
```

### Expected Result

- Server 1 publishes to Redis
- No instance has Siya connected locally
- Redis message is ignored by all instances
- Notification remains `PENDING` in database

```
[Server-3000] [info]: Redis event published { ... }
[Server-3001] [info]: Redis event ignored - receiver not connected locally { ... }
```

### Later When Siya Connects

4. Connect Siya to Server 2

```javascript
const siyaSocket = io('http://localhost:3001', {
  auth: { token: 'SIYA_TOKEN' }
});
```

5. The notification sync on connection will emit all unread notifications:

```
[Server-3001] [info]: Notification synced to user { ... }
[Server-3001] [info]: Notification sync completed { ... }
```

6. Siya receives the pending notification through `notification:new`

---

## Test 5: Graceful Shutdown

Verify Redis connections close properly.

### Steps

1. Start Server 1
2. Press `Ctrl+C` or stop the process

### Expected Logs

```
[Server-3000] [info]: SIGINT received. Starting graceful shutdown...
[Server-3000] [info]: HTTP server closed
[Server-3000] [info]: Redis subscriber client disconnected { instanceId: "server-1", client: "subscriber" }
[Server-3000] [info]: Redis publisher client disconnected { instanceId: "server-1", client: "publisher" }
[Server-3000] [info]: Redis pub/sub disconnected { instanceId: "server-1" }
[Server-3000] [info]: Prisma client disconnected
```

### Verification

- [ ] No Redis connection errors after shutdown
- [ ] Redis clients disconnected before process exits

---

## Test 6: Redis Connection Failure

Simulate Redis being unavailable.

### Steps

1. Stop Redis server
2. Try to start Server 1

### Expected Behavior

Server should log Redis connection errors but HTTP server may still start depending on implementation.

```
[Server-3000] [error]: Redis publisher client error { error: "Connection refused" }
[Server-3000] [error]: Redis subscriber client error { error: "Connection refused" }
```

3. Start Redis again
4. Server should automatically reconnect

---

## Test 7: REST API Consistency

Both instances share PostgreSQL. Notifications created on one instance should be readable from the other.

### Steps

1. Create notification on Server 1:

```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "REST Consistency",
  "message": "Created on port 3000",
  "type": "INFO"
}'
```

2. Fetch from Server 2:

```bash
curl --location 'http://localhost:3001/api/v1/notifications' \
--header 'Authorization: Bearer SIYA_TOKEN'
```

### Expected Result

Siya sees the notification created on Server 1 when querying Server 2.

---

## Testing Commands Summary

### Start Redis

```bash
redis-server
```

### Start Server Instances

```bash
# Terminal 1
npm run dev:1
```

```bash
# Terminal 2
npm run dev:2
```

### Register Users (on either server)

```bash
curl --location 'http://localhost:3000/api/v1/auth/register' \
--header 'Content-Type: application/json' \
--data '{"email":"ram@example.com","password":"Test@1234","fullName":"Ram"}'

curl --location 'http://localhost:3000/api/v1/auth/register' \
--header 'Content-Type: application/json' \
--data '{"email":"siya@example.com","password":"Test@1234","fullName":"Siya"}'
```

### Login

```bash
curl --location 'http://localhost:3000/api/v1/auth/login' \
--header 'Content-Type: application/json' \
--data '{"email":"ram@example.com","password":"Test@1234"}'

curl --location 'http://localhost:3001/api/v1/auth/login' \
--header 'Content-Type: application/json' \
--data '{"email":"siya@example.com","password":"Test@1234"}'
```

### Send Notification

```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "Redis Pub/Sub Test",
  "message": "Testing cross-instance delivery",
  "type": "MESSAGE"
}'
```

### Get Notifications

```bash
curl --location 'http://localhost:3001/api/v1/notifications' \
--header 'Authorization: Bearer SIYA_TOKEN'
```

### Get Unread Count

```bash
curl --location 'http://localhost:3001/api/v1/notifications/unread/count' \
--header 'Authorization: Bearer SIYA_TOKEN'
```

---

## Socket.IO Client Test Script

```javascript
const io = require('socket.io-client');

const ramSocket = io('http://localhost:3000', {
  auth: { token: 'RAM_TOKEN' }
});

const siyaSocket = io('http://localhost:3001', {
  auth: { token: 'SIYA_TOKEN' }
});

ramSocket.on('connect', () => {
  console.log('Ram connected to Server 3000');
});

siyaSocket.on('connect', () => {
  console.log('Siya connected to Server 3001');
});

siyaSocket.on('notification:new', (data) => {
  console.log('Siya received:', data);
});

// Send notification after 2 seconds
setTimeout(() => {
  fetch('http://localhost:3000/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer RAM_TOKEN'
    },
    body: JSON.stringify({
      receiverId: 'SIYA_USER_ID',
      title: 'Cross-instance via Redis',
      message: 'Hello Siya!',
      type: 'MESSAGE'
    })
  });
}, 2000);
```

---

## Verification Checklist

- [ ] Redis server running
- [ ] Server 1 starts on port 3000
- [ ] Server 2 starts on port 3001
- [ ] Both servers connect to Redis publisher and subscriber
- [ ] Both servers subscribe to `notifications` channel
- [ ] Ram connected to Server 1
- [ ] Siya connected to Server 2
- [ ] Notification sent from Ram reaches Siya
- [ ] Server 1 publishes to Redis
- [ ] Server 2 receives from Redis
- [ ] Siya receives exactly one notification
- [ ] Duplicate prevention works (same instance ignores own message)
- [ ] Offline notification persists in database
- [ ] Offline notification syncs on Siya reconnection
- [ ] Graceful shutdown closes Redis connections
- [ ] REST APIs consistent across instances

---

## Production Start

```bash
npm run build

# Terminal 1
npm run start:1

# Terminal 2
npm run start:2
```

---

## Important Notes

- Each server instance must have a unique `INSTANCE_ID`
- All instances must connect to the same Redis server
- All instances must connect to the same PostgreSQL database
- Redis messages include `sourceInstanceId` for deduplication
- Local delivery does not use Redis (optimization)
- Cross-instance delivery uses Redis Pub/Sub
