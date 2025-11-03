# Complete API Flow Guide with Payloads

## Scenario 1: Online Order (User purchases online, picks up at vendor)

### Step 1: User searches for nearest vendors with product availability
**API:** `POST /api/location/nearest-vendors`

**Payload:**
```json
{
  "pincode": "110001",
  // OR use coordinates
  "lat": 28.6139,
  "lng": 77.2090,
  // SKU IDs from the product
  "skuIds": ["sku123", "sku456"]
}
```

**Response:**
```json
{
  "userLocation": { "lat": 28.6139, "lng": 77.2090 },
  "nearest": [
    {
      "_id": "vendor789",
      "name": "ABC Store",
      "phone": "9876543210",
      "email": "abc@store.com",
      "address": "123 Main St",
      "location": { "type": "Point", "coordinates": [77.2090, 28.6139] },
      "stockData": [
        {
          "skuName": "Product A",
          "quantity": 5,
          "available": true
        },
        {
          "skuName": "Product B",
          "quantity": 3,
          "available": true
        }
      ],
      "isStockAvailable": true
    }
  ]
}
```

### Step 2: (Optional) Check exact stock availability
**API:** `POST /api/orders/check-stock`

**Payload:**
```json
{
  "productId": "prod456",
  "vendorId": "vendor789",
  "quantity": 2
}
```

**Response:**
```json
{
  "available": true,
  "message": "Product available"
}
// OR if not available
{
  "available": false,
  "message": "Insufficient stock for: Product A (Available: 1, Requested: 2)"
}
```

### Step 3: User creates online order
**API:** `POST /api/orders/combo`

**Payload:**
```json
{
  "userId": "user123",
  "productId": "prod456",
  "vendorId": "vendor789",
  "quantity": 2,
  "paymentMethod": "online"
}
```

**Response:**
```json
{
  "_id": "order123",
  "user": { "_id": "user123", "name": "John Doe", "email": "john@example.com" },
  "product": { "_id": "prod456", "title": "Combo Pack A+B", "isCombo": true },
  "vendor": { "_id": "vendor789", "name": "ABC Store" },
  "items": [
    {
      "sku": { "_id": "sku123", "title": "Product A" },
      "quantity": 2,
      "price": 100,
      "vendor": "vendor789"
    },
    {
      "sku": { "_id": "sku456", "title": "Product B" },
      "quantity": 2,
      "price": 150,
      "vendor": "vendor789"
    }
  ],
  "totalAmount": 500,
  "paymentMethod": "online",
  "status": "pending_verification",
  "orderVFC": "A1B2C3",
  "orderCode": "ORD-1730476800000-123",
  "orderType": "online",
  "createdAt": "2025-11-01T10:00:00.000Z"
}
```

**Note:** User receives email with orderVFC code: **A1B2C3**

### Step 4: User visits vendor and provides VFC
**API:** `POST /api/orders/verify-vfc`

**Payload:**
```json
{
  "orderVFC": "A1B2C3"
}
```

**Response:**
```json
{
  "message": "Order verified successfully",
  "order": {
    "_id": "order123",
    "user": { "name": "John Doe", "phone": "9876543210" },
    "items": [...],
    "totalAmount": 500,
    "status": "pending_verification"
  }
}
```

### Step 5: Vendor confirms order (inventory deducted here)
**API:** `POST /api/orders/confirm`

**Payload:**
```json
{
  "orderId": "order123",
  "status": "confirmed"
}
```

**Response:**
```json
{
  "message": "Order confirmed successfully",
  "order": {
    "_id": "order123",
    "status": "confirmed",
    "items": [...],
    "totalAmount": 500
  }
}
```

**What happens:**
- Inventory quantity reduced by 2 for each SKU
- Reserved quantity reduced by 2 for each SKU
- Inventory history created
- Order status changed to "confirmed"

### Step 5 (Alternative): Vendor partially rejects order
**API:** `POST /api/orders/confirm`

**Payload:**
```json
{
  "orderId": "order123",
  "status": "partially_rejected"
}
```

**Response:**
```json
{
  "message": "Order marked as partially rejected. Admin will handle this.",
  "order": {
    "_id": "order123",
    "status": "partially_rejected"
  }
}
```

**What happens:**
- All reservations released
- No inventory deducted
- Admin needs to handle this order

---

## Scenario 2: Walk-in Order (User walks into vendor store)

### Step 1: Vendor creates walk-in order
**API:** `POST /api/orders/walk-in`

**Payload:**
```json
{
  "name": "Jane Smith",
  "phone": "9876543210",
  "dob": "1995-05-15",
  "vendorId": "vendor789",
  "productId": "prod456",
  "quantity": 1
}
```

**Response:**
```json
{
  "user": {
    "_id": "user456",
    "permanentId": "U1001",
    "name": "Jane Smith",
    "phone": "9876543210",
    "temporaryUser": true
  },
  "order": {
    "_id": "order456",
    "user": "user456",
    "vendor": "vendor789",
    "product": "prod456",
    "items": [
      {
        "sku": "sku123",
        "quantity": 1,
        "price": 100,
        "vendor": "vendor789"
      },
      {
        "sku": "sku456",
        "quantity": 1,
        "price": 150,
        "vendor": "vendor789"
      }
    ],
    "totalAmount": 250,
    "paymentMethod": "cash",
    "status": "pending_verification",
    "orderCode": "ORD-1730476900000-456",
    "orderType": "walk_in"
  }
}
```

**Note:** 
- If user with same phone exists (temporaryUser: true), reuses that user
- Order created but inventory NOT deducted yet
- Stock availability checked before creating order

### Step 2: Vendor generates bill (inventory deducted here)
**API:** `POST /api/orders/generate-bill`

**Payload:**
```json
{
  "orderId": "order456",
  "cashAmount": 250
}
```

**Response:**
```json
{
  "message": "Bill generated successfully",
  "order": {
    "_id": "order456",
    "status": "confirmed",
    "totalAmount": 250
  },
  "cashEntry": {
    "_id": "cash123",
    "vendorId": "vendor789",
    "cashAmount": 250,
    "orderId": "order456",
    "billGeneratedAt": "2025-11-01T10:15:00.000Z"
  }
}
```

**What happens:**
- Inventory quantity reduced by 1 for each SKU
- Inventory history created
- Cash amount added to vendor's cash bank
- Order status changed to "confirmed"

---

## Scenario 3: Order Cancellation

### Cancel pending order (releases reservations)
**API:** `POST /api/orders/cancel`

**Payload:**
```json
{
  "orderId": "order123"
}
```

**Response:**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "_id": "order123",
    "status": "cancelled"
  }
}
```

**What happens:**
- For online orders: Reserved quantities released
- Order status changed to "cancelled"
- Cannot cancel confirmed/completed orders

---

## Additional APIs

### Get orders by user
**API:** `GET /api/orders/user/:userId?page=1&limit=10`

### Get orders by vendor
**API:** `GET /api/orders/vendor/:vendorId?page=1&limit=10`

### Get order by ID
**API:** `GET /api/orders/:id`

### Get all orders (admin)
**API:** `GET /api/orders?page=1&limit=10`

### Get partially rejected orders (admin)
**API:** `GET /api/orders/partially-rejected?page=1&limit=10`

### Admin updates pickup address for partially rejected order
**API:** `POST /api/orders/admin/update-pickup`

**Payload:**
```json
{
  "orderId": "order123",
  "vendorId": "vendor999",
  "pickupAddress": "456 New Street, City"
}
```

### Get vendor cash balance
**API:** `GET /api/orders/vendor/:vendorId/cash-balance`

### Admin deducts vendor cash
**API:** `POST /api/orders/vendor/deduct-cash`

**Payload:**
```json
{
  "vendorId": "vendor789",
  "amount": 1000,
  "reason": "Purchase from admin inventory"
}
```

### Get cash deduction history
**API:** `GET /api/orders/cash-deduction-history?page=1&limit=10&vendorId=vendor789`

### Get vendor cash deduction history
**API:** `GET /api/orders/vendor/:vendorId/cash-deduction-history?page=1&limit=10`

### Get available vendors for a SKU
**API:** `GET /api/orders/sku/:skuId/vendors`

---

## Important Notes

### Product Structure
- **Solo Product:** `isCombo: false`, has 1 SKU in `skus` array
- **Combo Product:** `isCombo: true`, has 2+ SKUs in `skus` array

### Quantity Behavior
- When you order quantity = 2 of a combo product with 3 SKUs
- Each SKU gets quantity = 2 reserved/deducted
- Total items = 3 SKUs × 2 = 6 items

### Stock Availability
- Available stock = `quantity - reservedQuantity`
- Online orders reserve stock immediately
- Walk-in orders check stock but don't reserve
- Stock is deducted only on confirmation/bill generation

### Order Status Flow
**Online:**
`pending_verification` → `confirmed` (or `partially_rejected` or `cancelled`)

**Walk-in:**
`pending_verification` → `confirmed` (via bill generation)

### Payment Methods
- `online`: User pays online before creating order
- `cash`: User pays cash at vendor (walk-in)
- `pickup`: (if needed for future use)
