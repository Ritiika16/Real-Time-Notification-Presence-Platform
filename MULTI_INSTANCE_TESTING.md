# Multi-Instance Setup & Testing Guide

This guide explains how to run multiple independent server instances on the same machine, sharing the same PostgreSQL database, before introducing Redis synchronization.

---

## What Was Implemented

### 1. Environment Variable Port Configuration
The server port is now fully configurable through the `PORT` environment variable.

```
PORT=3000  # Instance 1
PORT=3001  # Instance 2
```

The `env.ts` config already supported `PORT` with a default of `3000`.

### 2. Instance-Aware Logging
The logger now accepts the server port and tags every log line with `[Server-PORT]`:

```
2024-01-01 12:00:00 [Server-3000] [info]: Server is running on port 3000 in development mode
2024-01-01 12:00:01 [Server-3001] [info]: Server is running on port 3001 in development mode
```

### 3. New npm Scripts

```json
"start:1": "set PORT=3000&& node dist/index.js"
"start:2": "set PORT=3001&& node dist/index.js"
"dev:1": "set PORT=3000&& ts-node-dev --respawn --transpile-only src/index.ts"
"dev:2": "set PORT=3001&& ts-node-dev --respawn --transpile-only src/index.ts"
```

### 4. No Memory Sharing
Each instance maintains its own in-memory `PresenceManager`. Presence is NOT synchronized between instances in this step.

---

## How to Start Multiple Instances

### Option A: Using npm Scripts (Recommended)

Open two separate terminal windows.

**Terminal 1 - Instance 3000:**
```bash
npm run dev:1
```

**Terminal 2 - Instance 3001:**
```bash
npm run dev:2
```

### Option B: Using PowerShell Environment Variables

**Terminal 1 - Instance 3000:**
```powershell
$env:PORT=3000; npm run dev
```

**Terminal 2 - Instance 3001:**
```powershell
$env:PORT=3001; npm run dev
```

### Option C: Production Build

First build the project:
```bash
npm run build
```

Then start each instance:

**Terminal 1 - Instance 3000:**
```bash
npm run start:1
```

**Terminal 2 - Instance 3001:**
```bash
npm run start:2
```

---

## Testing Instructions

### Step 1: Start Both Instances

Start two terminal windows and run:

```bash
# Terminal 1
npm run dev:1
```

```bash
# Terminal 2
npm run dev:2
```

You should see logs like:

```
2024-01-01 12:00:00 [Server-3000] [info]: Server is running on port 3000 in development mode
```

```
2024-01-01 12:00:01 [Server-3001] [info]: Server is running on port 3001 in development mode
```

---

### Step 2: Register Test Users

Use either server instance. Both share the same PostgreSQL database.

**Register Ram (User A):**
```bash
curl --location 'http://localhost:3000/api/v1/auth/register' \
--header 'Content-Type: application/json' \
--data '{
  "email": "ram@example.com",
  "password": "Test@1234",
  "fullName": "Ram"
}'
```

**Register Siya (User B):**
```bash
curl --location 'http://localhost:3000/api/v1/auth/register' \
--header 'Content-Type: application/json' \
--data '{
  "email": "siya@example.com",
  "password": "Test@1234",
  "fullName": "Siya"
}'
```

---

### Step 3: Login and Get Tokens

**Login Ram:**
```bash
curl --location 'http://localhost:3000/api/v1/auth/login' \
--header 'Content-Type: application/json' \
--data '{
  "email": "ram@example.com",
  "password": "Test@1234"
}'
```

Save the JWT token as `RAM_TOKEN`.

**Login Siya:**
```bash
curl --location 'http://localhost:3001/api/v1/auth/login' \
--header 'Content-Type: application/json' \
--data '{
  "email": "siya@example.com",
  "password": "Test@1234"
}'
```

Save the JWT token as `SIYA_TOKEN`.

---

### Step 4: Connect Ram to Server 3000

Open browser console or Node.js Socket.IO client:

```javascript
const ramSocket = io('http://localhost:3000', {
  auth: { token: 'RAM_TOKEN' }
});

ramSocket.on('connect', () => {
  console.log('Ram connected to Server 3000:', ramSocket.id);
});
```

**Expected Server 3000 Log:**
```
[Server-3000] [info]: Socket connected { userId: "ram-uuid", email: "ram@example.com", socketId: "..." }
[Server-3000] [info]: user:online event emitted { userId: "ram-uuid" }
```

**Expected Server 3001 Log:**
```
(no Ram connection logs - instance has independent memory)
```

---

### Step 5: Connect Siya to Server 3001

Open a second browser window or Node.js client:

```javascript
const siyaSocket = io('http://localhost:3001', {
  auth: { token: 'SIYA_TOKEN' }
});

siyaSocket.on('connect', () => {
  console.log('Siya connected to Server 3001:', siyaSocket.id);
});
```

**Expected Server 3001 Log:**
```
[Server-3001] [info]: Socket connected { userId: "siya-uuid", email: "siya@example.com", socketId: "..." }
[Server-3001] [info]: user:online event emitted { userId: "siya-uuid" }
```

**Expected Server 3000 Log:**
```
(no Siya connection logs - instance has independent memory)
```

---

### Step 6: Check Online Users Per Instance

**Server 3000 Online Users:**
```bash
curl --location 'http://localhost:3000/api/v1/presence/online' \
--header 'Authorization: Bearer RAM_TOKEN'
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "users": [
    {
      "userId": "ram-uuid",
      "email": "ram@example.com",
      "socketIds": ["ram-socket-id"],
      "online": true
    }
  ]
}
```

**Server 3001 Online Users:**
```bash
curl --location 'http://localhost:3001/api/v1/presence/online' \
--header 'Authorization: Bearer SIYA_TOKEN'
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "users": [
    {
      "userId": "siya-uuid",
      "email": "siya@example.com",
      "socketIds": ["siya-socket-id"],
      "online": true
    }
  ]
}
```

**Verification:**
- ✓ Server 3000 only knows about Ram
- ✓ Server 3001 only knows about Siya
- ✓ Each instance has independent in-memory PresenceManager

---

### Step 7: Cross-Instance REST API Test

Both instances share the same PostgreSQL database, so REST data is consistent across instances.

**Create a notification on Server 3000 (Ram sends to Siya):**
```bash
curl --location 'http://localhost:3000/api/v1/notifications' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer RAM_TOKEN' \
--data '{
  "receiverId": "SIYA_USER_ID",
  "title": "Hello from Ram",
  "message": "Testing multi-instance setup",
  "type": "MESSAGE"
}'
```

**Fetch notifications on Server 3001 (Siya's account):**
```bash
curl --location 'http://localhost:3001/api/v1/notifications' \
--header 'Authorization: Bearer SIYA_TOKEN'
```

**Expected Result:**
Siya can see the notification created on Server 3000 because both instances share the database.

---

### Step 8: Cross-Instance Socket.IO Limitation

Because presence is **NOT synchronized** between instances, real-time Socket.IO delivery will not work across instances in this step.

**Test:**
1. Siya is connected only to Server 3001
2. Ram sends a notification to Siya via Server 3000
3. Server 3000 checks its PresenceManager - Siya is NOT online there
4. Notification is saved as `PENDING` in the database
5. Siya does NOT receive real-time notification on Server 3001
6. However, fetching `/api/v1/notifications` on Server 3001 shows the pending notification

**Expected Log on Server 3000:**
```
[Server-3000] [info]: Notification stored for offline user { notificationId: "...", receiverId: "siya-uuid" }
```

This is **expected behavior** before Redis Pub/Sub is introduced.

---

## Expected Behavior Summary

| Feature | Cross-Instance Behavior | Reason |
|---------|------------------------|--------|
| REST APIs | ✓ Shared | Same PostgreSQL database |
| Database | ✓ Shared | Same Prisma client configuration |
| Socket.IO connections | ✗ Not shared | Independent in-memory PresenceManager |
| Online users list | ✗ Per-instance | No presence synchronization |
| Real-time delivery | ✗ Per-instance | No cross-instance messaging |

---

## Production Notes

For true horizontal scaling with real-time cross-instance delivery, the next step is to introduce:

- **Redis Pub/Sub** or **Redis Adapter for Socket.IO**
- **Shared presence store** (Redis-backed)
- **Cross-instance socket broadcasting**

This step intentionally does NOT implement Redis to demonstrate the limitation and prepare the architecture.

---

## Verification Checklist

- [ ] Both instances start successfully on different ports
- [ ] Logs include `[Server-3000]` and `[Server-3001]` prefixes
- [ ] REST APIs work on both ports
- [ ] Database is shared (create on 3000, read on 3001)
- [ ] Ram connects to Server 3000
- [ ] Siya connects to Server 3001
- [ ] Server 3000 only shows Ram as online
- [ ] Server 3001 only shows Siya as online
- [ ] Real-time Socket.IO does NOT cross instances (expected)
- [ ] No Redis dependency introduced
- [ ] No memory shared between instances
