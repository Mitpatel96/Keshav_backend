# Debug Inventory Issue

## Step 1: Check Inventory Status

Call this API first to see what inventory actually exists:

```bash
POST /api/orders/check-stock
Content-Type: application/json

{
  "productId": "69077bd97edef95cdbd496c9",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "quantity": 2
}
```

This will return detailed information about:
- How many inventory records exist for each SKU
- What status each record has (confirmed/pending/rejected)
- Actual quantities and reserved quantities
- Available quantities

## Step 2: Check the Response

Look for these issues:

### Issue 1: No Inventory Records
```json
{
  "skuDetails": [{
    "skuTitle": "Men's Cotton T-Shirts",
    "totalInventoryRecords": 0,
    "confirmedRecords": 0
  }]
}
```
**Solution:** Need to add inventory for this SKU at this vendor

### Issue 2: Inventory Exists but Not Confirmed
```json
{
  "skuDetails": [{
    "skuTitle": "Men's Cotton T-Shirts",
    "totalInventoryRecords": 2,
    "confirmedRecords": 0,
    "inventoryStatuses": [
      { "status": "pending", "quantity": 100 },
      { "status": "pending", "quantity": 100 }
    ]
  }]
}
```
**Solution:** Need to confirm the inventory records

### Issue 3: Inventory Confirmed but Zero Quantity
```json
{
  "skuDetails": [{
    "skuTitle": "Men's Cotton T-Shirts",
    "totalInventoryRecords": 2,
    "confirmedRecords": 2,
    "totalQuantity": 0,
    "availableQuantity": 0
  }]
}
```
**Solution:** Need to add quantity to inventory

### Issue 4: All Reserved
```json
{
  "skuDetails": [{
    "skuTitle": "Men's Cotton T-Shirts",
    "totalQuantity": 200,
    "reservedQuantity": 200,
    "availableQuantity": 0
  }]
}
```
**Solution:** Other orders have reserved all stock

## Step 3: Try Creating Order Again

After checking inventory status, try creating the order:

```bash
POST /api/orders/combo
Content-Type: application/json

{
  "userId": "68fcfc9dd8d704b5d62c187a",
  "productId": "69077bd97edef95cdbd496c9",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "quantity": 2,
  "paymentMethod": "online"
}
```

Now the error response will include debug information:
```json
{
  "message": "SKU Men's Cotton T-Shirts not available at this vendor",
  "debug": {
    "skuId": "...",
    "vendorId": "...",
    "inventoryRecordsFound": 2,
    "inventoryStatuses": ["pending", "pending"]
  }
}
```

## Common Issues and Solutions

### 1. Inventory Status is "pending" instead of "confirmed"

**Check:**
```javascript
db.inventories.find({ 
  vendor: ObjectId("690263b16d9ee5a0db0c5905"),
  sku: ObjectId("...") 
})
```

**Fix:**
```javascript
db.inventories.updateMany(
  { 
    vendor: ObjectId("690263b16d9ee5a0db0c5905"),
    status: "pending"
  },
  { 
    $set: { status: "confirmed" } 
  }
)
```

### 2. No Inventory Records Exist

**Check Product SKUs:**
```javascript
db.products.findOne({ _id: ObjectId("69077bd97edef95cdbd496c9") })
```

**Create Inventory:**
```javascript
db.inventories.insertOne({
  sku: ObjectId("sku_id_here"),
  vendor: ObjectId("690263b16d9ee5a0db0c5905"),
  quantity: 200,
  reservedQuantity: 0,
  status: "confirmed"
})
```

### 3. Mismatch Between getNearestVendors and Order Creation

**Before Fix:**
- `getNearestVendors` didn't filter by status
- Showed inventory with status "pending"
- Order creation filtered by status "confirmed"
- Mismatch caused the error

**After Fix:**
- Both APIs now filter by `status: 'confirmed'`
- Consistent behavior

## Verification Query

Run this in MongoDB to see actual inventory:

```javascript
db.inventories.aggregate([
  {
    $match: {
      vendor: ObjectId("690263b16d9ee5a0db0c5905")
    }
  },
  {
    $lookup: {
      from: "skus",
      localField: "sku",
      foreignField: "_id",
      as: "skuDetails"
    }
  },
  {
    $project: {
      skuTitle: { $arrayElemAt: ["$skuDetails.title", 0] },
      quantity: 1,
      reservedQuantity: 1,
      status: 1,
      available: { 
        $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] 
      }
    }
  }
])
```

This will show you exactly what inventory exists at the vendor.
