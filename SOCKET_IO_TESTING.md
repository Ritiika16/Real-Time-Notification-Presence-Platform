# Socket.IO Testing Guide

This guide provides step-by-step instructions for testing Socket.IO functionality including notification delivery, synchronization, read receipts, and acknowledgements.

## Prerequisites

- Server running on `http://localhost:3000`
- Two user accounts (sender and receiver) registered
- JWT tokens for both users
- Browser with developer console or Node.js Socket.IO client

---

## Testing Setup

### Option 1: Browser Console Testing

1. Open browser (Chrome/Firefox)
2. Navigate to `http://localhost:3000` (or any page)
3. Open Developer Console (F12)
4. Load Socket.IO client:
   ```javascript
   const script = document.createElement('script');
   script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
   document.head.appendChild(script);
   ```

### Option 2: Node.js Client Testing

1. Create a test file `test-socket.js`:
   ```javascript
   const io = require('socket.io-client');
   const socket = io('http://localhost:3000', {
     auth: { token: 'YOUR_JWT_TOKEN' }
   });
   ```

---

## Test Scenario 1: Online Notification Delivery

### Setup

**Tab 1 (Sender):**
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'SENDER_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Sender connected:', socket.id);
});

socket.on('notification:new', (data) => {
  console.log('Received notification:', data);
});
```

**Tab 2 (Receiver):**
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Receiver connected:', socket.id);
});

socket.on('notification:new', (data) => {
  console.log('Received notification:', data);
  console.log('Sender:', data.senderName, data.senderEmail);
});
```

### Execute Test

1. Connect both sockets (run the code in both tabs)
2. Use Postman to create a notification for the receiver:
   ```
   POST http://localhost:3000/api/v1/notifications
   Authorization: Bearer SENDER_JWT_TOKEN
   Body: {
     "receiverId": "RECEIVER_USER_ID",
     "title": "Online Delivery Test",
     "message": "This notification should be delivered immediately",
     "type": "MESSAGE"
   }
   ```

### Expected Results

**Receiver Tab Console:**
```javascript
Receiver connected: abc123
Received notification: {
  id: "uuid",
  senderId: "uuid",
  senderEmail: "sender@example.com",
  senderName: "Sender User",
  title: "Online Delivery Test",
  message: "This notification should be delivered immediately",
  type: "MESSAGE",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

**Verification:**
- ✓ Notification received immediately
- ✓ Sender name and email populated
- ✓ Server logs show "Notification delivered to online user"

---

## Test Scenario 2: Notification Synchronization on Reconnect

### Setup

**Step 1: Create Notification While Receiver Offline**

1. Close receiver browser tab (don't connect)
2. Use Postman to create notification:
   ```
   POST http://localhost:3000/api/v1/notifications
   Authorization: Bearer SENDER_JWT_TOKEN
   Body: {
     "receiverId": "RECEIVER_USER_ID",
     "title": "Sync Test",
     "message": "This notification should sync on reconnect",
     "type": "ALERT"
   }
   ```

**Step 2: Connect Receiver and Sync**

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Receiver connected:', socket.id);
});

socket.on('notification:new', (data) => {
  console.log('Synced notification:', data);
  console.log('Notification ID:', data.id);
  console.log('Sender:', data.senderName, data.senderEmail);
});

socket.on('disconnect', () => {
  console.log('Receiver disconnected');
});
```

### Expected Results

**Receiver Console:**
```javascript
Receiver connected: abc123
Synced notification: {
  id: "uuid",
  senderId: "uuid",
  senderEmail: "sender@example.com",
  senderName: "Sender User",
  title: "Sync Test",
  message: "This notification should sync on reconnect",
  type: "ALERT",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

**Server Logs:**
```
Notification synced to user { notificationId: 'uuid', userId: 'uuid', socketId: 'abc123' }
Notification sync completed { userId: 'uuid', socketId: 'abc123', syncedCount: 1 }
```

**Verification:**
- ✓ All unread notifications synced automatically
- ✓ Sender details included in synced notifications
- ✓ Server logs show sync completion

---

## Test Scenario 3: Multiple Sockets for Same User

### Setup

**Tab 1 (Socket 1):**
```javascript
const socket1 = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket1.on('connect', () => {
  console.log('Socket 1 connected:', socket1.id);
});

socket1.on('notification:new', (data) => {
  console.log('Socket 1 received:', data.id);
});
```

**Tab 2 (Socket 2):**
```javascript
const socket2 = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket2.on('connect', () => {
  console.log('Socket 2 connected:', socket2.id);
});

socket2.on('notification:new', (data) => {
  console.log('Socket 2 received:', data.id);
});
```

### Execute Test

1. Connect both sockets (run code in both tabs)
2. Use Postman to create notification for receiver
3. Both sockets should receive the notification

### Expected Results

**Tab 1 Console:**
```javascript
Socket 1 connected: abc123
Synced notification: { id: "uuid", ... }  // from sync
Socket 1 received: uuid  // from new notification
```

**Tab 2 Console:**
```javascript
Socket 2 connected: def456
Synced notification: { id: "uuid", ... }  // from sync
Socket 2 received: uuid  // from new notification
```

**Verification:**
- ✓ Both sockets receive sync notifications
- ✓ Both sockets receive new notifications
- ✓ Each socket has unique socket ID
- ✓ Server logs show correct socket count

---

## Test Scenario 4: Notification Read Receipt via Socket

### Setup

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('notification:new', (data) => {
  console.log('Received notification:', data.id);
  
  // Mark as read via socket
  socket.emit('notification:read', { notificationId: data.id }, (response) => {
    console.log('Read acknowledgment:', response);
  });
});

socket.on('notification:read:success', (data) => {
  console.log('Read confirmed:', data);
  console.log('Status:', data.status);
  console.log('Read at:', data.readAt);
});

socket.on('notification:error', (data) => {
  console.error('Error:', data.error);
});
```

### Execute Test

1. Connect socket
2. Create notification for receiver via Postman
3. Socket receives notification and automatically marks as read

### Expected Results

**Console:**
```javascript
Connected: abc123
Received notification: uuid
Read acknowledgment: { success: true }
Read confirmed: {
  notificationId: "uuid",
  status: "READ",
  readAt: "2024-01-01T00:00:01.000Z"
}
```

**Server Logs:**
```
Notification marked as read via socket { userId: 'uuid', notificationId: 'uuid' }
```

**Verification:**
- ✓ Notification marked as read via socket
- ✓ Success acknowledgment received
- ✓ Server emits `notification:read:success`
- ✓ Status updated to READ
- ✓ Read timestamp populated

---

## Test Scenario 5: Delivery Acknowledgement

### Setup

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'RECEIVER_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('notification:new', (data) => {
  console.log('Received notification:', data.id);
  
  // Acknowledge receipt
  socket.emit('notification:received', { notificationId: data.id }, (response) => {
    console.log('Delivery acknowledgment:', response);
  });
});

socket.on('notification:delivered', (data) => {
  console.log('Delivery confirmed:', data);
});
```

### Execute Test

1. Connect socket
2. Create notification with status PENDING via Postman
3. Socket receives notification and acknowledges

### Expected Results

**Console:**
```javascript
Connected: abc123
Received notification: uuid
Delivery acknowledgment: { success: true }
```

**Server Logs:**
```
Notification acknowledged and marked as delivered { userId: 'uuid', notificationId: 'uuid' }
```

**Verification:**
- ✓ Delivery acknowledgment sent
- ✓ Status changes from PENDING to DELIVERED
- ✓ Server logs show acknowledgment
- ✓ Acknowledgment response: `{ success: true }`

---

## Test Scenario 6: Ownership Validation

### Setup

**User A Socket:**
```javascript
const socketA = io('http://localhost:3000', {
  auth: { token: 'USER_A_TOKEN' }
});

socketA.on('connect', () => {
  console.log('User A connected');
});

// Try to mark notification that belongs to User B
socketA.emit('notification:read', { notificationId: 'USER_B_NOTIFICATION_ID' }, (response) => {
  console.log('Response:', response);
  // Expected: { success: false, error: 'Unauthorized' }
});

socketA.on('notification:error', (data) => {
  console.error('Error:', data.error);
});
```

### Expected Results

**Console:**
```javascript
User A connected
Response: { success: false, error: 'Unauthorized' }
```

**Server Logs:**
```
Unauthorized read attempt on notification { userId: 'userA', notificationId: 'uuid', receiverId: 'userB' }
```

**Verification:**
- ✓ Unauthorized read attempt rejected
- ✓ Error response returned
- ✓ Server logs show security warning
- ✓ Notification status unchanged

---

## Test Scenario 7: Error Handling

### Invalid Notification ID

```javascript
socket.emit('notification:read', { notificationId: 'invalid-uuid' }, (response) => {
  console.log('Response:', response);
  // Expected: { success: false, error: 'Notification not found' }
});
```

### Missing Notification ID

```javascript
socket.emit('notification:read', {}, (response) => {
  console.log('Response:', response);
  // Expected: { success: false, error: 'Notification not found' }
});
```

### Expected Results

**Console:**
```javascript
Response: { success: false, error: 'Notification not found' }
```

**Server Logs:**
```
Notification not found for read request { userId: 'uuid', notificationId: 'invalid-uuid' }
```

---

## Socket.IO Events Reference

### Client → Server Events

| Event | Payload | Acknowledgment | Description |
|-------|---------|----------------|-------------|
| `notification:read` | `{ notificationId: string }` | `{ success: boolean, error?: string }` | Mark notification as read |
| `notification:received` | `{ notificationId: string }` | `{ success: boolean, error?: string }` | Acknowledge notification receipt |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | `NotificationPayload` | New notification received |
| `notification:read:success` | `{ notificationId, status, readAt }` | Notification marked as read confirmation |
| `notification:delivered` | `{ notificationId }` | Notification delivery confirmation |
| `notification:error` | `{ error: string }` | Error occurred |
| `user:online` | `{ userId, online: true }` | User came online |
| `user:offline` | `{ userId, online: false }` | User went offline |

---

## Complete Test Script (Node.js)

```javascript
const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const RECEIVER_TOKEN = 'YOUR_RECEIVER_JWT_TOKEN';
const SENDER_TOKEN = 'YOUR_SENDER_JWT_TOKEN';

// Test 1: Online Delivery
function testOnlineDelivery() {
  console.log('\n=== Test 1: Online Delivery ===');
  
  const receiverSocket = io(SERVER_URL, {
    auth: { token: RECEIVER_TOKEN }
  });

  receiverSocket.on('connect', () => {
    console.log('Receiver connected:', receiverSocket.id);
  });

  receiverSocket.on('notification:new', (data) => {
    console.log('✓ Notification received:', data.title);
    console.log('✓ Sender:', data.senderName, data.senderEmail);
    receiverSocket.disconnect();
  });

  // Create notification via API (use Postman or curl)
  console.log('Create notification via Postman now...');
}

// Test 2: Sync on Reconnect
function testSyncOnReconnect() {
  console.log('\n=== Test 2: Sync on Reconnect ===');
  
  const socket = io(SERVER_URL, {
    auth: { token: RECEIVER_TOKEN }
  });

  let syncCount = 0;

  socket.on('connect', () => {
    console.log('Connected:', socket.id);
  });

  socket.on('notification:new', (data) => {
    syncCount++;
    console.log(`✓ Synced notification ${syncCount}:`, data.title);
  });

  setTimeout(() => {
    console.log(`✓ Total synced: ${syncCount}`);
    socket.disconnect();
  }, 2000);
}

// Test 3: Read Receipt
function testReadReceipt() {
  console.log('\n=== Test 3: Read Receipt ===');
  
  const socket = io(SERVER_URL, {
    auth: { token: RECEIVER_TOKEN }
  });

  socket.on('connect', () => {
    console.log('Connected:', socket.id);
  });

  socket.on('notification:new', (data) => {
    console.log('Received:', data.id);
    
    socket.emit('notification:read', { notificationId: data.id }, (response) => {
      console.log('✓ Read acknowledgment:', response);
    });
  });

  socket.on('notification:read:success', (data) => {
    console.log('✓ Read confirmed:', data.status);
    socket.disconnect();
  });
}

// Run tests
// testOnlineDelivery();
// testSyncOnReconnect();
// testReadReceipt();
```

---

## Testing Checklist

### Online Delivery
- [ ] Receiver connected via Socket.IO
- [ ] Sender creates notification via REST API
- [ ] Notification received immediately by receiver
- [ ] Sender name and email populated in payload
- [ ] Status marked as DELIVERED in database
- [ ] Server logs show delivery

### Offline Sync
- [ ] Notification created while receiver offline
- [ ] Status is PENDING in database
- [ ] Receiver connects via Socket.IO
- [ ] All unread notifications synced
- [ ] Sender details included in sync
- [ ] Server logs show sync completion

### Multiple Sockets
- [ ] Same user connects from multiple sockets
- [ ] Each socket receives notifications
- [ ] Each socket receives sync on connection
- [ ] Unique socket IDs tracked
- [ ] Socket count correct in logs

### Read Receipts
- [ ] Mark as read via socket event
- [ ] Ownership validation works
- [ ] Status changes to READ
- [ ] Read timestamp populated
- [ ] Success acknowledgment received
- [ ] Unauthorized attempts rejected

### Delivery Acknowledgement
- [ ] Client acknowledges receipt
- [ ] Status changes from PENDING to DELIVERED
- [ ] Already delivered notifications handled
- [ ] Server logs show acknowledgment

### Error Handling
- [ ] Invalid notification ID handled
- [ ] Missing payload handled
- [ ] Unauthorized access logged
- [ ] Error events emitted to client

---

## Troubleshooting

### Issue: Socket not connecting
**Solution:** Check JWT token is valid and server is running. Verify authentication middleware.

### Issue: Notifications not syncing
**Solution:** Check if user has unread notifications. Verify sync function is called in presence handler.

### Issue: Acknowledgment not received
**Solution:** Ensure callback function is provided. Check server-side error handling.

### Issue: Ownership validation failing
**Solution:** Verify receiverId matches authenticated user ID. Check database for correct notification ownership.

---

## Next Steps

After completing Socket.IO tests, verify all scenarios pass and server logs show expected behavior. Combine with Postman tests for comprehensive coverage.
