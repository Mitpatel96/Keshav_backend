# API Usage Clarification - When to Call Which API

## Online Order Flow (Correct Sequence)

### Step 1: User selects a product
**Frontend Action:** User browses products and clicks on a product (solo or combo)

**Data you have:**
- `productId`: "prod456"
- Product details (title, SKUs, etc.)

---

### Step 2: Find nearest vendors with this product in stock
**API:** `POST /api/location/nearest-vendors`

**When to call:** After user selects a product, before showing vendor list

**Payload:**
```json
{
  "pincode": "110001",  // or lat/lng from user location
  "skuIds": ["sku123", "sku456"]  // Extract from product.skus
}
```

**Purpose:** 
- Shows which vendors have ALL SKUs of this product in stock
- Shows available quantity at each vendor
- Sorted by distance from user

**Response shows:**
```json
{
  "nearest": [
    {
      "_id": "vendor789",
      "name": "ABC Store",
      "stockData": [
        { "skuName": "Product A", "quantity": 5, "available": true },
        { "skuName": "Product B", "quantity": 3, "available": true }
      ],
      "isStockAvailable": true  // ← All SKUs available
    },
    {
      "_id": "vendor999",
      "name": "XYZ Store",
      "stockData": [
        { "skuName": "Product A", "quantity": 2, "available": true },
        { "skuName": "Product B", "quantity": 0, "available": false }
      ],
      "isStockAvailable": false  // ← Not all SKUs available
    }
  ]
}
```

**Frontend Action:** 
- Show only vendors where `isStockAvailable: true`
- Display available quantity
- Let user select vendor and quantity

---

### Step 3: User selects vendor and quantity
**Frontend Action:** 
- User picks a vendor from the list
- User selects quantity (with max limit shown from stockData)

---

### Step 4: Create order
**API:** `POST /api/orders/combo`

**When to call:** When user clicks "Place Order" / "Checkout"

**Payload:**
```json
{
  "userId": "user123",
  "productId": "prod456",
  "vendorId": "vendor789",  // Selected from Step 2
  "quantity": 2,
  "paymentMethod": "online"
}
```

**Purpose:** 
- Creates order
- Reserves inventory
- Sends VFC code to user email

---

## When to Use Other APIs

### `GET /api/orders/sku/:skuId/vendors`
**When to call:** ❌ **NOT NEEDED for your flow**

**Original purpose:** If you want to show vendors for a single SKU (not a product)

**Your case:** You're working with products (which contain SKUs), so use `getNearestVendors` instead

---

### `POST /api/orders/check-stock`
**When to call:** ⚠️ **OPTIONAL - Real-time validation**

**Use cases:**
1. **Before placing order** - Double-check stock is still available
2. **When user changes quantity** - Validate new quantity is available
3. **Refresh button** - User wants to check latest stock

**Payload:**
```json
{
  "productId": "prod456",
  "vendorId": "vendor789",
  "quantity": 2
}
```

**Example flow:**
```
User selects quantity: 5
↓
Call checkProductStock
↓
Response: { "available": false, "message": "Insufficient stock for: Product A (Available: 3, Requested: 5)" }
↓
Show error: "Only 3 units available"
```

**Note:** This is optional because `createComboProductOrder` already validates stock. Use this for better UX to show errors before user clicks "Place Order".

---

### `POST /api/orders/cancel`
**When to call:** When user wants to cancel their pending order

**Use cases:**
1. User placed order but changed mind before pickup
2. User can't reach vendor location
3. Order timeout (user didn't show up)

**Payload:**
```json
{
  "orderId": "order123"
}
```

**Important:** 
- Only works for `pending_verification` status
- Cannot cancel `confirmed` or `completed` orders
- Releases reserved inventory

---

## Complete Online Order Flow (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User browses products                                     │
│    Frontend: Show product list                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User clicks on a product                                  │
│    Frontend: Show product details page                      │
│    Data: productId, product.skus (array of SKU IDs)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Call: POST /api/location/nearest-vendors                 │
│    Payload: { pincode, skuIds: [from product.skus] }       │
│    Response: List of vendors with stock availability        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend: Show vendor list                                │
│    - Filter: Only show vendors with isStockAvailable=true   │
│    - Display: Vendor name, distance, available quantity     │
│    - Let user select: Vendor + Quantity                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. (Optional) User changes quantity                          │
│    Call: POST /api/orders/check-stock                       │
│    Payload: { productId, vendorId, quantity }               │
│    Purpose: Real-time validation before order               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User clicks "Place Order"                                 │
│    Call: POST /api/orders/combo                             │
│    Payload: { userId, productId, vendorId, quantity }       │
│    Response: Order created with orderVFC                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Frontend: Show success message                            │
│    - Display: orderVFC code                                 │
│    - Display: Vendor address                                │
│    - Display: "Show this code at vendor"                    │
│    - Button: "Cancel Order" (calls cancelOrder API)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. User visits vendor with VFC code                          │
│    Vendor calls: POST /api/orders/verify-vfc                │
│    Payload: { orderVFC: "A1B2C3" }                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Vendor confirms order                                     │
│    Vendor calls: POST /api/orders/confirm                   │
│    Payload: { orderId, status: "confirmed" }                │
│    Result: Inventory deducted, order completed              │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary - Which APIs You Actually Need

### ✅ **Must Use:**
1. `POST /api/location/nearest-vendors` - Find vendors with stock
2. `POST /api/orders/combo` - Create order
3. `POST /api/orders/verify-vfc` - Vendor verifies customer
4. `POST /api/orders/confirm` - Vendor confirms/rejects order

### ⚠️ **Optional (Better UX):**
1. `POST /api/orders/check-stock` - Real-time stock validation
2. `POST /api/orders/cancel` - User cancels order

### ❌ **Not Needed for Your Flow:**
1. `GET /api/orders/sku/:skuId/vendors` - You're using products, not individual SKUs

---

## Quick Reference

| API | When to Call | Purpose |
|-----|-------------|---------|
| `getNearestVendors` | After product selection | Find vendors with stock |
| `checkProductStock` | Before placing order (optional) | Validate stock availability |
| `createComboProductOrder` | User clicks "Place Order" | Create order & reserve stock |
| `verifyOrderWithVFC` | User shows VFC at vendor | Verify order details |
| `confirmComboProductOrder` | Vendor confirms pickup | Deduct inventory |
| `cancelOrder` | User cancels order | Release reservations |
| `getVendorsForSku` | ❌ Not needed | Use getNearestVendors instead |
