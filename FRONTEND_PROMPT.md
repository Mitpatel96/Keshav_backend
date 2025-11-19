# Frontend Socket Notification Implementation Prompt

Use this prompt in Cursor to implement the frontend socket notifications:

---

## Prompt for Cursor:

```
I need to implement Socket.IO client-side notifications in my React/Next.js frontend application.

Backend Details:
- Socket.IO server is running on the same domain as the API (or configure the URL)
- Server expects authentication via 'authenticate' event
- Two types of notifications:
  1. Admin: Low stock alerts (event: 'low_stock_alert')
  2. Vendor: New order notifications (event: 'new_order')

Requirements:

1. Install socket.io-client package

2. Create a Socket Context/Provider that:
   - Connects to the Socket.IO server
   - Handles authentication on connection
   - Manages socket connection lifecycle
   - Provides socket instance to components

3. Authentication:
   - After user login, emit 'authenticate' event with:
     {
       userId: user._id,
       role: user.role, // 'admin' or 'vendor'
       permanentId: user.permanentId // for vendors only
     }

4. Admin Side - Low Stock Alerts:
   - Listen for 'low_stock_alert' event
   - Show notification/toast when received with:
     - Vendor name
     - SKU name
     - Current quantity
   - Display format: "{vendorName} - {skuName} has only {quantity} units left"

5. Vendor Side - New Order Notifications:
   - Listen for 'new_order' event
   - Show notification/toast when received with:
     - Order code
     - Order VFC (verification code)
     - Total amount
     - Customer details
   - Display format: "New order {orderCode} received - Amount: ₹{totalAmount}"

6. UI Requirements:
   - Use toast/notification library (react-toastify, sonner, or similar)
   - Show notifications in real-time
   - Include timestamp
   - Make notifications dismissible
   - For admin: Show low stock alerts prominently (maybe with warning icon)
   - For vendor: Show new order alerts with order details

7. Integration:
   - Connect socket when user logs in
   - Disconnect socket when user logs out
   - Reconnect on page refresh if user is authenticated
   - Handle connection errors gracefully

Please implement this with proper TypeScript types, error handling, and clean code structure.
```

---

## Additional Context (if needed):

If Cursor needs more details, provide:

- Your frontend framework (React, Next.js, Vue, etc.)
- Your state management (Redux, Zustand, Context API, etc.)
- Your notification/toast library preference
- Your authentication system details
- Backend API URL/port

---

## Example Socket Event Data:

**Low Stock Alert (Admin):**
```json
{
  "vendorName": "Vendor ABC",
  "skuName": "Product XYZ",
  "quantity": 25,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**New Order (Vendor):**
```json
{
  "orderId": "order_id_here",
  "orderData": {
    "orderCode": "ORD-1234567890-123",
    "orderVFC": "ABC123",
    "totalAmount": 1000,
    "items": [...],
    "user": {
      "name": "Customer Name",
      "email": "customer@email.com",
      "phone": "1234567890"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

