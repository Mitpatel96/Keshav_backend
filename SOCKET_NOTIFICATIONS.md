# Socket Notifications Implementation

This document describes the socket notification system implemented for real-time notifications.

## Features Implemented

### 1. Admin Side - Low Stock Alerts
- **Trigger**: When vendor inventory quantity for any SKU falls below 30 units
- **Notification Event**: `low_stock_alert`
- **Data Sent**:
  ```json
  {
    "vendorName": "Vendor Name",
    "skuName": "SKU Title",
    "quantity": 25,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **Triggered In**:
  - When vendor accepts inventory transfer (`respondToPendingTransfer`)
  - When inventory quantity is updated (`updateInventoryQty`)
  - When order is confirmed and inventory is deducted (`confirmComboProductOrder`)
  - When damage ticket is created/approved and inventory is deducted (`createDamageTicket`, `approvePendingDamageTicket`)

### 2. Vendor Side - New Order Notifications
- **Trigger**: When an online order is created
- **Notification Event**: `new_order`
- **Data Sent**:
  ```json
  {
    "orderId": "order_id",
    "orderData": {
      "orderCode": "ORD-1234567890-123",
      "orderVFC": "ABC123",
      "totalAmount": 1000,
      "items": [...],
      "user": {...}
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **Triggered In**: `createComboProductOrder` when `orderType === 'online'`

## Socket Connection Setup

### Client Connection
1. Connect to the Socket.IO server
2. Emit `authenticate` event with user information:
   ```javascript
   socket.emit('authenticate', {
     userId: 'user_id',      // User._id
     role: 'admin' | 'vendor' | 'user',
     permanentId: 'V1234'    // Optional: For vendors, provide permanentId to map to Vendor._id
   });
   ```

### Room Assignment
- **Admin**: Joins `admin` room - receives all low stock alerts
- **Vendor**: Joins `vendor:{vendorId}` room - receives notifications for their orders only

## Frontend Integration Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Authenticate after login
socket.emit('authenticate', {
  userId: currentUser._id,
  role: currentUser.role,
  permanentId: currentUser.permanentId // For vendors
});

// Listen for low stock alerts (Admin)
socket.on('low_stock_alert', (data) => {
  console.log('Low stock alert:', data);
  // Show notification: `${data.vendorName} - ${data.skuName} has only ${data.quantity} units left`
});

// Listen for new orders (Vendor)
socket.on('new_order', (data) => {
  console.log('New order received:', data);
  // Show notification: `New order ${data.orderData.orderCode} received`
});
```

## Files Modified

1. **src/services/socketService.ts** - New file for socket initialization and notification functions
2. **src/server.ts** - Updated to initialize Socket.IO with HTTP server
3. **src/controllers/inventoryController.ts** - Added low stock checks
4. **src/controllers/orderController.ts** - Added vendor notifications and low stock checks
5. **src/controllers/damageController.ts** - Added low stock checks

## Dependencies Added

- `socket.io` - Socket.IO server
- `@types/socket.io` - TypeScript types for Socket.IO

## Configuration

The Socket.IO server is configured with CORS enabled for all origins. In production, you should restrict this to your frontend domain:

```typescript
cors: {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST']
}
```

