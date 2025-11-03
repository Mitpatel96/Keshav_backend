# Inventory Reservation System - Implementation Guide

## Overview
Implemented a robust inventory reservation system to prevent race conditions when multiple users purchase the same product simultaneously.

## Key Changes

### 1. Inventory Model Enhancement
**File:** `src/models/Inventory.ts`

Added `reservedQuantity` field to track inventory reserved for pending orders:
```typescript
reservedQuantity: { type: Number, default: 0 }
```

**Available Quantity Formula:**
```
Available Quantity = quantity - reservedQuantity
```

### 2. Order Flow Changes

#### A. Online Orders (createComboProductOrder)
**Flow:**
1. User selects product (solo or combo) and vendor
2. System checks available quantity (actual - reserved)
3. If available, reserves inventory using MongoDB transactions
4. Creates order with status `pending_verification`
5. Sends verification code (orderVFC) to user
6. User visits vendor with VFC

**Key Features:**
- Atomic reservation using MongoDB sessions/transactions
- Prevents double-booking by reserving inventory immediately
- Works for both solo (1 SKU) and combo (multiple SKUs) products
- Quantity parameter applies to all SKUs in the product

#### B. Order Verification (verifyOrderWithVFC)
- Vendor verifies the orderVFC
- Shows order details
- No inventory changes at this stage

#### C. Order Confirmation (confirmComboProductOrder)
**Status: "confirmed"**
- Deducts from actual inventory
- Releases reservation
- Records inventory history
- Order marked as confirmed

**Status: "partially_rejected"**
- Releases all reservations
- Order marked for admin handling
- No inventory deduction

#### D. Walk-in Orders (createWalkInOrder)
**Flow:**
1. Customer walks into vendor location
2. Vendor creates order with product and quantity
3. System checks available stock (considering reservations)
4. Creates order with status `pending_verification`
5. No reservation made (offline purchase)

#### E. Bill Generation (generateBill)
**Flow:**
1. Vendor generates bill for walk-in order
2. Deducts inventory atomically
3. Updates cash amount
4. Order marked as confirmed

### 3. Stock Availability Checks

#### getNearestVendors (locationController.ts)
Updated to show available quantity considering reservations:
```typescript
const availableQty = item.quantity - (item.reservedQuantity || 0);
```

#### checkProductStock (NEW API)
Allows checking product availability before ordering:
- Input: productId, vendorId, quantity
- Output: { available: true/false, message: string }

### 4. Order Cancellation (NEW API)
**cancelOrder:**
- Releases reservations for pending online orders
- Prevents cancellation of confirmed orders
- Uses transactions for atomicity

## Edge Cases Handled

### 1. Race Condition Prevention
**Scenario:** User A and User B try to buy the last combo product simultaneously

**Solution:** 
- MongoDB transactions with session locks
- First user to commit transaction gets the product
- Second user receives "Insufficient stock" error

### 2. Cross-Product Stock Impact
**Scenario:** 
- Combo product has SKU A (qty: 2) and SKU B (qty: 4)
- Solo product with SKU A exists
- User buys 2 units of solo SKU A

**Solution:**
- Solo purchase reserves/deducts SKU A
- Combo product availability automatically reflects this
- getNearestVendors shows updated availability

### 3. Quantity Multiplication
**Scenario:** Combo with 3 SKUs, user orders quantity = 3

**Solution:**
- Each SKU gets quantity = 3 reserved/deducted
- Total items = 3 SKUs × 3 quantity = 9 items

### 4. Partial Stock Availability
**Scenario:** Combo needs SKU A (available: 5) and SKU B (available: 2)

**Solution:**
- Maximum purchasable quantity = 2 (limited by SKU B)
- System prevents ordering more than available

## API Changes Summary

### Modified APIs:
1. **createComboProductOrder** - Now handles solo and combo with reservation
2. **confirmComboProductOrder** - Accepts status parameter (confirmed/partially_rejected)
3. **createWalkInOrder** - Simplified to use productId and quantity
4. **generateBill** - Added transaction support and stock validation
5. **getVendorsForSku** - Shows available quantity (actual - reserved)

### New APIs:
1. **checkProductStock** - Check availability before ordering
2. **cancelOrder** - Cancel order and release reservations

## Request/Response Examples

### Create Online Order
```json
POST /api/orders/combo
{
  "userId": "user123",
  "productId": "prod456",
  "vendorId": "vendor789",
  "quantity": 2,
  "paymentMethod": "online"
}
```

### Confirm Order
```json
POST /api/orders/confirm
{
  "orderId": "order123",
  "status": "confirmed"  // or "partially_rejected"
}
```

### Create Walk-in Order
```json
POST /api/orders/walk-in
{
  "name": "John Doe",
  "phone": "9876543210",
  "dob": "1990-01-01",
  "vendorId": "vendor789",
  "productId": "prod456",
  "quantity": 1
}
```

### Check Stock
```json
POST /api/orders/check-stock
{
  "productId": "prod456",
  "vendorId": "vendor789",
  "quantity": 2
}
```

## Database Consistency

All inventory operations use MongoDB transactions to ensure:
- Atomicity: All or nothing
- Consistency: Reserved + actual quantities always match
- Isolation: Concurrent operations don't interfere
- Durability: Changes are permanent once committed

## Monitoring & Cleanup

**Recommended:** Implement a background job to:
1. Release reservations for orders pending > 24 hours
2. Alert admins about stuck orders
3. Clean up cancelled orders

## Testing Checklist

- [ ] Two users ordering same product simultaneously
- [ ] Solo product purchase affecting combo availability
- [ ] Combo product purchase affecting solo availability
- [ ] Order cancellation releases reservations
- [ ] Walk-in orders check real-time availability
- [ ] Partially rejected orders don't deduct inventory
- [ ] Transaction rollback on errors
- [ ] Stock display in getNearestVendors is accurate
