# Testing Guide - Notification Synchronization & Read Receipts

This guide provides comprehensive testing instructions for the Notification Service with synchronization, read receipts, and delivery improvements.

## Prerequisites

- Node.js and npm installed
- PostgreSQL database running
- Server running on `http://localhost:3000`
- Postman installed (or use curl)
- Socket.IO client for testing (can use browser console or Node.js client)

## Setup

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Ensure database is migrated:**
   ```bash
   npx prisma migrate dev
   ```

---

## Postman Testing Instructions

### 1. User Registration & Authentication

#### Register User 1 (Sender)
```
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "sender@example.com",
  "password": "Test@1234",
  "fullName": "Sender User"
}
```

#### Register User 2 (Receiver)
```
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "receiver@example.com",
  "password": "Test@1234",
  "fullName": "Receiver User"
}
```

#### Login as Sender
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "sender@example.com",
  "password": "Test@1234"
}
```

**Save the JWT token** from the response as `SENDER_TOKEN`

#### Login as Receiver
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "receiver@example.com",
  "password": "Test@1234"
}
```

**Save the JWT token** from the response as `RECEIVER_TOKEN`

---

### 2. Online Notification Delivery Test

#### Create Notification (Receiver Online)
```
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json
Authorization: Bearer SENDER_TOKEN

{
  "receiverId": "RECEIVER_USER_ID",
  "title": "Test Notification",
  "message": "This is a test notification for online delivery",
  "type": "MESSAGE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "title": "Test Notification",
    "message": "This is a test notification for online delivery",
    "type": "MESSAGE",
    "status": "DELIVERED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "deliveredAt": "2024-01-01T00:00:00.000Z",
    "readAt": null
  }
}
```

**Verification:**
- Notification status should be `DELIVERED` (not PENDING)
- Check server logs for "Notification delivered to online user"

---

### 3. Offline Notification Test

#### Step 1: Create Notification (Receiver Offline)
```
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json
Authorization: Bearer SENDER_TOKEN

{
  "receiverId": "RECEIVER_USER_ID",
  "title": "Offline Test Notification",
  "message": "This notification was created while receiver was offline",
  "type": "ALERT"
}
```

**Expected Response:**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "title": "Offline Test Notification",
    "message": "This notification was created while receiver was offline",
    "type": "ALERT",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "deliveredAt": null,
    "readAt": null
  }
}
```

**Verification:**
- Notification status should be `PENDING`
- Check server logs for "Notification stored for offline user"

#### Step 2: Connect Receiver via Socket.IO
- Open browser console and connect as receiver
- The notification should be synced automatically

---

### 4. Get Notifications Test

#### Get All Notifications
```
GET http://localhost:3000/api/v1/notifications
Authorization: Bearer RECEIVER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "receiverId": "uuid",
      "title": "Test Notification",
      "message": "This is a test notification",
      "type": "MESSAGE",
      "status": "DELIVERED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "deliveredAt": "2024-01-01T00:00:00.000Z",
      "readAt": null,
      "sender": {
        "id": "uuid",
        "email": "sender@example.com",
        "fullName": "Sender User"
      }
    }
  ]
}
```

**Verification:**
- Notifications should include sender details
- Should be ordered newest first
- Status should reflect current state

---

### 5. Get Unread Count Test

#### Get Unread Count
```
GET http://localhost:3000/api/v1/notifications/unread/count
Authorization: Bearer RECEIVER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "count": 2
}
```

**Verification:**
- Count should match notifications with status `PENDING` or `DELIVERED`
- `READ` notifications should not be counted

---

### 6. Mark as Read Test

#### Mark Notification as Read (REST API)
```
PATCH http://localhost:3000/api/v1/notifications/NOTIFICATION_ID/read
Authorization: Bearer RECEIVER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "MESSAGE",
    "status": "READ",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "deliveredAt": "2024-01-01T00:00:00.000Z",
    "readAt": "2024-01-01T00:00:01.000Z"
  }
}
```

**Verification:**
- Status should change to `READ`
- `readAt` should be populated
- Check server logs for "Notification marked as read"

#### Verify Unread Count Decreases
```
GET http://localhost:3000/api/v1/notifications/unread/count
Authorization: Bearer RECEIVER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1
}
```

---

### 7. Multiple Sockets Test

1. Open two browser tabs or windows
2. Connect both tabs as the same user (same JWT)
3. Create a notification for that user
4. Both tabs should receive the notification simultaneously
5. Check server logs for socket count

---

## Test Scenarios Summary

### ✓ Online Delivery
- Receiver is connected via Socket.IO
- Sender creates notification
- Notification is delivered immediately
- Status is marked as `DELIVERED`
- Sender name and email are populated

### ✓ Offline Notification Sync
- Receiver is offline
- Sender creates notification
- Notification is stored with status `PENDING`
- Receiver connects via Socket.IO
- All unread notifications are synced automatically
- Server logs show "Notification sync completed"

### ✓ Multiple Sockets
- Same user connects from multiple devices/tabs
- Notification is delivered to all sockets
- Each socket receives the sync on connection
- Presence manager tracks all socket IDs

### ✓ Mark as Read
- User marks notification as read via REST API
- Status changes to `READ`
- `readAt` timestamp is set
- Unread count decreases
- Server logs show "Notification marked as read"

### ✓ Unread Count
- Unread count returns correct number
- Only `PENDING` and `DELIVERED` notifications counted
- Count decreases when notification is read

### ✓ Notification History
- GET /notifications returns all notifications
- Ordered newest first
- Includes sender details
- Shows correct status and timestamps

---

## Common Issues & Troubleshooting

### Issue: Notification not delivered to online user
**Solution:** Check if user is actually online. Use GET /api/v1/presence/online to verify.

### Issue: Notifications not syncing on reconnect
**Solution:** Check server logs for "Notification sync completed" message. Verify user ID is correct.

### Issue: Unread count incorrect
**Solution:** Check notification statuses in database. Only PENDING and DELIVERED count as unread.

### Issue: Sender name/email empty
**Solution:** Verify sender user exists in database and has email and fullName fields populated.

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/v1/notifications | Create notification | Yes |
| GET | /api/v1/notifications | Get user notifications | Yes |
| GET | /api/v1/notifications/unread/count | Get unread count | Yes |
| PATCH | /api/v1/notifications/:id/read | Mark as read | Yes |
| GET | /api/v1/presence/online | Get online users | Yes |
| POST | /api/v1/auth/register | Register user | No |
| POST | /api/v1/auth/login | Login user | No |

---

## Next Steps

After completing Postman tests, proceed to Socket.IO testing to verify real-time functionality.
