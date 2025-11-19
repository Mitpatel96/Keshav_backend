# Payment Flow - Complete Examples

This document provides comprehensive examples of SKUs, Products, and all payloads for the payment flow.

---

## 0. ID Reference - All Dependent IDs Used in Examples

This section lists all IDs used throughout the examples and their relationships.

### Categories
- `6501a2b3c4d5e6f7g8h9i0j1` - Hair Care (used by Shampoo, Conditioner, Hair Oil SKUs)
- `6501a2b3c4d5e6f7g8h9i0j2` - Personal Care (used by Soap SKUs)
- `6501a2b3c4d5e6f7g8h9i0j3` - Household Care (used by Detergent SKUs)

### SKUs
- `6904eb63229e6a88a246ad08` - Shampoo 1 Litre (belongs to category j1)
- `6904eb84229e6a88a246ad0b` - Conditioner 250ml (belongs to category j1) / Shampoo 5 Litre
- `6904eb9d229e6a88a246ad0e` - Hair Oil 100ml (belongs to category j1) / Shampoo 10 Litre
- `6909cf5732bc97d775a3f2db` - Soap 250g (belongs to category j2)
- `6909cf6832bc97d775a3f2dc` - Soap 500g (belongs to category j2)

### Products
- `69077bd97edef95cdbd496c9` - Shampoo (Solo Product, uses SKUs: 6904eb63229e6a88a246ad08, 6904eb84229e6a88a246ad0b, 6904eb9d229e6a88a246ad0e)
- `6914c2638b8f7bdcfabf6cc2` - Soap (Solo Product, uses SKUs: 6909cf5732bc97d775a3f2db, 6909cf6832bc97d775a3f2dc)
- `69077bd97edef95cdbd496d0` - Winter Care Bundle (Combo Product, uses SKUs: 6904eb63229e6a88a246ad08, 6904eb84229e6a88a246ad0b, 6904eb9d229e6a88a246ad0e)

### Users
- `69175407176e27861c9aab5c` - User (used in payment and order examples)

### Vendors
- `690263b16d9ee5a0db0c5905` - Vendor (used in payment and order examples)

### Payments
- `691b66dae837fefa713ce701` - Payment record (created from payment intent, used to create order)

### Orders
- `691c77ea937fefa824df8123` - Order (created from payment)

### Promo Codes
- `6914c8dc771e78a9fe5f0ad5` - PromoCode ID (AMAN6MTD3)
- `6914c8dc771e78a9fe5f0ad3` - PromoBatch ID

---

## 1. Category Create API Examples

**Endpoint:** `POST /api/categories`

### Example 1: Hair Care Category
**Request Payload:**
```json
{
  "name": "Hair Care",
  "description": "Shampoo, conditioner, hair oil, and other hair care products"
}
```

### Example 2: Personal Care Category
**Request Payload:**
```json
{
  "name": "Personal Care",
  "description": "Soap, body wash, and personal hygiene products"
}
```

### Example 3: Household Care Category
**Request Payload:**
```json
{
  "name": "Household Care",
  "description": "Detergents, cleaning supplies, and household products"
}
```

### Example 4: Pet Supplies Category
**Request Payload:**
```json
{
  "name": "Pet Supplies",
  "description": "Food, toys, grooming, and accessories for pets"
}
```

---

## 2. SKU Create API Examples

**Endpoint:** `POST /api/skus`

**Note:** `skuId` is auto-generated from the title. `active` defaults to `true`.

### Example 1: Shampoo SKU - 1 Litre
**Request Payload:**
```json
{
  "title": "Shampoo 1 Litre",
  "brand": "Luxury Hair",
  "category": "6501a2b3c4d5e6f7g8h9i0j1",
  "images": ["https://example.com/images/shampoo-1l.jpg"],
  "mrp": 200,
  "unit": "litre",
  "unitValue": 1
}
```

### Example 2: Shampoo SKU - 5 Litre
**Request Payload:**
```json
{
  "title": "Shampoo 5 Litre",
  "brand": "Luxury Hair",
  "category": "6501a2b3c4d5e6f7g8h9i0j1",
  "images": ["https://example.com/images/shampoo-5l.jpg"],
  "mrp": 800,
  "unit": "litre",
  "unitValue": 5
}
```

### Example 3: Shampoo SKU - 10 Litre
**Request Payload:**
```json
{
  "title": "Shampoo 10 Litre",
  "brand": "Luxury Hair",
  "category": "6501a2b3c4d5e6f7g8h9i0j1",
  "images": ["https://example.com/images/shampoo-10l.jpg"],
  "mrp": 1500,
  "unit": "litre",
  "unitValue": 10
}
```

### Example 4: Soap SKU - 250g
**Request Payload:**
```json
{
  "title": "Soap 250g",
  "brand": "Fresh Clean",
  "category": "6501a2b3c4d5e6f7g8h9i0j2",
  "images": ["https://example.com/images/soap-250g.jpg"],
  "mrp": 50,
  "unit": "g",
  "unitValue": 250
}
```

### Example 5: Soap SKU - 500g
**Request Payload:**
```json
{
  "title": "Soap 500g",
  "brand": "Fresh Clean",
  "category": "6501a2b3c4d5e6f7g8h9i0j2",
  "images": ["https://example.com/images/soap-500g.jpg"],
  "mrp": 90,
  "unit": "g",
  "unitValue": 500
}
```

### Example 6: Conditioner SKU - 250ml
**Request Payload:**
```json
{
  "title": "Conditioner 250ml",
  "brand": "Luxury Hair",
  "category": "6501a2b3c4d5e6f7g8h9i0j1",
  "images": ["https://example.com/images/conditioner-250ml.jpg"],
  "mrp": 150,
  "unit": "ml",
  "unitValue": 250
}
```

### Example 7: Hair Oil SKU - 100ml
**Request Payload:**
```json
{
  "title": "Hair Oil 100ml",
  "brand": "Luxury Hair",
  "category": "6501a2b3c4d5e6f7g8h9i0j1",
  "images": ["https://example.com/images/hair-oil-100ml.jpg"],
  "mrp": 120,
  "unit": "ml",
  "unitValue": 100
}
```

### Example 8: Detergent Powder SKU - 1kg
**Request Payload:**
```json
{
  "title": "Detergent Powder 1kg",
  "brand": "Super Clean",
  "category": "6501a2b3c4d5e6f7g8h9i0j3",
  "images": ["https://example.com/images/detergent-1kg.jpg"],
  "mrp": 300,
  "unit": "kg",
  "unitValue": 1
}
```

### Example 9: Detergent Powder SKU - 5kg
**Request Payload:**
```json
{
  "title": "Detergent Powder 5kg",
  "brand": "Super Clean",
  "category": "6501a2b3c4d5e6f7g8h9i0j3",
  "images": ["https://example.com/images/detergent-5kg.jpg"],
  "mrp": 1200,
  "unit": "kg",
  "unitValue": 5
}
```

---

## 3. Product Create API Examples

**Endpoint:** `POST /api/products`

**Note:** The `skus` array should contain objects with `sku` field set to the SKU's MongoDB `_id` (not `skuId`). These SKUs must already exist in the database.

### Example 1: Solo Product (Shampoo - with variants)
**Request Payload:**
```json
{
  "title": "Shampoo",               - 691c91a364c71b9932cfd914
  "description": "Premium quality shampoo for all hair types",
  "images": [
    "https://example.com/images/shampoo-1.jpg",
    "https://example.com/images/shampoo-2.jpg"
  ],
  "isCombo": false,
  "price": 200,
  "strikeThroughPrice": 250,
  "skus": [
    {
      "sku": "6904eb63229e6a88a246ad08"
    },
    {
      "sku": "6904eb84229e6a88a246ad0b"
    },
    {
      "sku": "6904eb9d229e6a88a246ad0e"
    }
  ]
}
```

### Example 2: Solo Product (Soap - with variants)
**Request Payload:**
```json
{
  "title": "Soap",             - 691c92be64c71b9932cfd93a
  "description": "Gentle cleansing soap for daily use",
  "images": [
    "https://example.com/images/soap-1.jpg"
  ],
  "isCombo": false,
  "price": 50,
  "strikeThroughPrice": 60,
  "skus": [
    {
      "sku": "6909cf5732bc97d775a3f2db"
    },
    {
      "sku": "6909cf6832bc97d775a3f2dc"
    }
  ]
}
```

### Example 3: Combo Product (Winter Care Bundle)
**Request Payload:**
```json
{
  "title": "Winter Care Bundle",
  "description": "Complete winter care package with shampoo, conditioner, and hair oil",
  "images": [
    "https://example.com/images/winter-combo-1.jpg",
    "https://example.com/images/winter-combo-2.jpg"
  ],
  "isCombo": true,
  "price": 3000,
  "strikeThroughPrice": 3800,
  "skus": [
    {
      "sku": "6904eb63229e6a88a246ad08"
    },
    {
      "sku": "6904eb84229e6a88a246ad0b"
    },
    {
      "sku": "6904eb9d229e6a88a246ad0e"
    }
  ]
}
```

**Note:** For combo products, all SKUs listed in the `skus` array will be included together. For solo products, the `skus` array represents the available variants that users can choose from.

---

## 4. User & Vendor Examples

### User (Assumed to be created via registration)
**ID Used:** `69175407176e27861c9aab5c`

**Note:** User creation is typically handled via registration/auth endpoints. This ID is used throughout payment and order examples.

### Vendor Example
**ID Used:** `690263b16d9ee5a0db0c5905`

**Note:** Vendor creation is typically handled via admin endpoints. This ID is used throughout payment and order examples.

---

## 5. Promo Code Examples

**Endpoint:** `POST /api/promos` (or similar)

### Promo Code Used in Examples
**PromoCode:** `AMAN6MTD3`
**PromoCodeId:** `6914c8dc771e78a9fe5f0ad5`
**PromoBatchId:** `6914c8dc771e78a9fe5f0ad3`
**Discount Type:** `PERCENTAGE`
**Discount Value:** `15`

**Note:** Promo codes are typically created via admin endpoints. The promo code `AMAN6MTD3` is used in payment examples.

---

## 6. Payment Flow Payloads

### 6.1 Step 1: Create Payment Intent

**Endpoint:** `POST /api/payment/create-intent`

**Request Payload (Mixed: Combo + Solo Products):**
```json
{
  "userId": "69175407176e27861c9aab5c",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "items": [
    {
      "productId": "69077bd97edef95cdbd496c9",
      "quantity": 2
      // No skuId for combo products - all SKUs included
    },
    {
      "productId": "6914c2638b8f7bdcfabf6cc2",
      "quantity": 1,
      "skuId": "6909cf5732bc97d775a3f2db"  // Required for solo products
    }
  ],
  "promoCode": "AMAN6MTD3",  // Optional
  "currency": "aud"  // Optional, defaults to "aud"
}
```

**Request Payload (Only Solo Products with Variants):**
```json
{
  "userId": "69175407176e27861c9aab5c",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "items": [
    {
      "productId": "69077bd97edef95cdbd496c9",
      "quantity": 3,
      "skuId": "6904eb84229e6a88a246ad0b"  // Selected variant: 5L
    },
    {
      "productId": "6914c2638b8f7bdcfabf6cc2",
      "quantity": 2,
      "skuId": "6909cf6832bc97d775a3f2dc"  // Selected variant: 500g
    }
  ],
  "currency": "aud"
}
```

**Request Payload (Only Combo Products):**
```json
{
  "userId": "69175407176e27861c9aab5c",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "items": [
    {
      "productId": "69077bd97edef95cdbd496d0",
      "quantity": 2
      // No skuId needed - all SKUs in combo are included
    }
  ],
  "promoCode": "WINTER20",
  "currency": "aud"
}
```

**Response:**
```json
{
  "paymentId": "691b66dae837fefa713ce701",
  "clientSecret": "pi_3SUX01EHLBOpZZbu1ICwWeS7_secret_xyz123",
  "subtotal": 6300,
  "discount": 900,
  "total": 5400,
  "currency": "aud"
}
```

---

### 6.2 Step 2: Confirm Payment (Frontend - Stripe.js)

**Client-side code:**
```javascript
const stripe = Stripe('pk_test_your_publishable_key');
const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
});

if (result.error) {
  // Handle error
  console.error(result.error.message);
} else {
  // Payment succeeded or requires action
  console.log(result.paymentIntent.status);
  console.log(result.paymentIntent.id); // Use this in step 3
}
```

---

### 6.3 Step 3: Confirm Payment (Backend)

**Endpoint:** `POST /api/payment/confirm`

**Request Payload:**
```json
{
  "paymentIntentId": "pi_3SUX01EHLBOpZZbu1ICwWeS7"
}
```

**Response (when payment succeeded):**
```json
{
  "message": "Payment successful",
  "status": "succeeded",
  "payment": {
    "_id": "691b66dae837fefa713ce701",
    "user": "69175407176e27861c9aab5c",
    "vendor": "690263b16d9ee5a0db0c5905",
    "items": [
      {
        "product": "69077bd97edef95cdbd496c9",
        "quantity": 2,
        "unitPrice": 3000,
        "subtotal": 6000,
        "components": [
          {
            "sku": "6904eb63229e6a88a246ad08",
            "quantityPerBundle": 1,
            "_id": "691b66dae837fefa713ce703"
          },
          {
            "sku": "6904eb84229e6a88a246ad0b",
            "quantityPerBundle": 1,
            "_id": "691b66dae837fefa713ce704"
          },
          {
            "sku": "6904eb9d229e6a88a246ad0e",
            "quantityPerBundle": 1,
            "_id": "691b66dae837fefa713ce705"
          }
        ],
        "_id": "691b66dae837fefa713ce702"
      },
      {
        "product": "6914c2638b8f7bdcfabf6cc2",
        "quantity": 1,
        "unitPrice": 300,
        "subtotal": 300,
        "components": [
          {
            "sku": "6909cf5732bc97d775a3f2db",
            "quantityPerBundle": 1,
            "_id": "691b66dae837fefa713ce707"
          }
        ],
        "_id": "691b66dae837fefa713ce706"
      }
    ],
    "subtotal": 6300,
    "discountAmount": 900,
    "totalAmount": 5400,
    "currency": "aud",
    "status": "succeeded",
    "stripePaymentIntentId": "pi_3SUX01EHLBOpZZbu1ICwWeS7",
    "promoCode": "AMAN6MTD3",
    "promoCodeId": "6914c8dc771e78a9fe5f0ad5",
    "promoBatchId": "6914c8dc771e78a9fe5f0ad3",
    "promoDiscountType": "PERCENTAGE",
    "promoDiscountValue": 15,
    "receiptUrl": "https://pay.stripe.com/receipts/...",
    "createdAt": "2024-11-17T18:18:02.618Z",
    "updatedAt": "2024-11-17T18:20:15.234Z"
  }
}
```

**Response (when payment requires action):**
```json
{
  "message": "Payment status updated",
  "status": "requires_action",
  "payment": {
    "_id": "691b66dae837fefa713ce701",
    "status": "requires_action",
    // ... other fields
  }
}
```

---

### 6.4 Step 4: Create Order

**Endpoint:** `POST /api/orders/combo-product-order`

**Request Payload (Using paymentId - Recommended for payment flow):**
```json
{
  "paymentId": "691b66dae837fefa713ce701"
}
```

**Request Payload (Without paymentId - for direct orders/walk-in):**
```json
{
  "userId": "69175407176e27861c9aab5c",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "items": [
    {
      "productId": "69077bd97edef95cdbd496c9",
      "quantity": 2
      // No skuId for combo products
    },
    {
      "productId": "6914c2638b8f7bdcfabf6cc2",
      "quantity": 1,
      "skuId": "6909cf5732bc97d775a3f2db"  // Required for solo products
    }
  ],
  "paymentMethod": "cash"  // or "online"
}
```

**Response:**
```json
{
  "_id": "691c77ea937fefa824df8123",
  "user": {
    "_id": "69175407176e27861c9aab5c",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "vendor": {
    "_id": "690263b16d9ee5a0db0c5905",
    "name": "Vendor Name",
    "address": "..."
  },
  "items": [
    {
      "_id": "691c77ea937fefa824df8124",
      "product": "69077bd97edef95cdbd496c9",
      "sku": {
        "_id": "6904eb63229e6a88a246ad08",
        "title": "Shampoo 1 Litre",
        "skuId": "SKU-SH-001"
      },
      "quantity": 2,
      "price": 200,
      "vendor": "690263b16d9ee5a0db0c5905"
    },
    {
      "_id": "691c77ea937fefa824df8125",
      "product": "69077bd97edef95cdbd496c9",
      "sku": {
        "_id": "6904eb84229e6a88a246ad0b",
        "title": "Shampoo 5 Litre",
        "skuId": "SKU-SH-005"
      },
      "quantity": 2,
      "price": 800,
      "vendor": "690263b16d9ee5a0db0c5905"
    },
    {
      "_id": "691c77ea937fefa824df8126",
      "product": "69077bd97edef95cdbd496c9",
      "sku": {
        "_id": "6904eb9d229e6a88a246ad0e",
        "title": "Shampoo 10 Litre",
        "skuId": "SKU-SH-010"
      },
      "quantity": 2,
      "price": 1500,
      "vendor": "690263b16d9ee5a0db0c5905"
    },
    {
      "_id": "691c77ea937fefa824df8127",
      "product": "6914c2638b8f7bdcfabf6cc2",
      "sku": {
        "_id": "6909cf5732bc97d775a3f2db",
        "title": "Soap 250g",
        "skuId": "SKU-SO-250"
      },
      "quantity": 1,
      "price": 50,
      "vendor": "690263b16d9ee5a0db0c5905"
    }
  ],
  "totalAmount": 5400,
  "discountAmount": 900,
  "paymentMethod": "online",
  "status": "pending_verification",
  "orderVFC": "ABC123",
  "orderCode": "ORD-1734467890123-456",
  "orderType": "online",
  "promoCode": "AMAN6MTD3",
  "payment": "691b66dae837fefa713ce701",
  "createdAt": "2024-11-17T18:25:30.123Z",
  "updatedAt": "2024-11-17T18:25:30.123Z"
}
```

---

## 7. Key Changes in Payloads

### What Changed:

1. **`createPaymentIntent` (POST `/api/payment/create-intent`):**
   - ✅ **Items array now supports `skuId`** for solo products
   - ✅ For combo products: no `skuId` needed (all SKUs included automatically)
   - ✅ For solo products: **`skuId` is required** to select the variant

2. **`createComboProductOrder` (POST `/api/orders/combo-product-order`):**
   - ✅ Can accept `paymentId` (extracts everything from payment record)
   - ✅ Can accept `items` array with `skuId` for solo products
   - ✅ When `paymentId` is provided, all other params are extracted from payment

3. **Payment Record:**
   - ✅ Stores `components` array (all SKUs involved)
   - ✅ For combo: includes all SKUs from the product
   - ✅ For solo: includes only the selected SKU

### Important Notes:

- **Combo Products (`isCombo: true`):**
  - No `skuId` needed in `items` array
  - All SKUs in the product are automatically included
  - Price is the product's price (sum of all SKU MRPs)

- **Solo Products (`isCombo: false`):**
  - **`skuId` is REQUIRED** in `items` array
  - Only the selected SKU is included
  - Price is the selected SKU's MRP

- **Payment Status:**
  - Only call `createComboProductOrder` when `confirmPayment` returns `status: "succeeded"`
  - If status is `"requires_action"`, wait for payment to complete first

---

## 8. Complete Flow Example

### Scenario: User buys 2x Winter Combo + 1x Soap 250g with promo code

**1. Create Payment Intent:**
```json
POST /api/payment/create-intent
{
  "userId": "69175407176e27861c9aab5c",
  "vendorId": "690263b16d9ee5a0db0c5905",
  "items": [
    {
      "productId": "69077bd97edef95cdbd496d0",  // Combo product
      "quantity": 2
    },
    {
      "productId": "6914c2638b8f7bdcfabf6cc2",  // Solo product
      "quantity": 1,
      "skuId": "6909cf5732bc97d775a3f2db"  // Selected variant
    }
  ],
  "promoCode": "AMAN6MTD3",
  "currency": "aud"
}
```

**2. Confirm with Stripe.js (Frontend)**
- User completes payment
- Get `paymentIntent.id`

**3. Confirm Payment (Backend):**
```json
POST /api/payment/confirm
{
  "paymentIntentId": "pi_3SUX01EHLBOpZZbu1ICwWeS7"
}
```

**4. Create Order (after status = "succeeded"):**
```json
POST /api/orders/combo-product-order
{
  "paymentId": "691b66dae837fefa713ce701"
}
```

---

## 9. Error Handling

### Common Errors:

**1. Missing `skuId` for solo product:**
```json
// ❌ Wrong - solo product without skuId
{
  "productId": "6914c2638b8f7bdcfabf6cc2",
  "quantity": 1
}

// ✅ Correct
{
  "productId": "6914c2638b8f7bdcfabf6cc2",
  "quantity": 1,
  "skuId": "6909cf5732bc97d775a3f2db"
}
```

**2. Order created before payment succeeded:**
```json
// ❌ Error response
{
  "message": "Payment not completed yet",
  "status": 400
}

// ✅ Solution: Wait for confirmPayment to return status: "succeeded"
```

**3. Invalid `skuId` for product:**
```json
// ❌ Error response
{
  "message": "SKU 6909cf5732bc97d775a3f2db does not belong to product Shampoo",
  "status": 400
}

// ✅ Solution: Use a skuId that belongs to the product
```

---

## 10. Add to Cart API Examples

**Endpoint:** `POST /api/cart/items`

**Authentication:** Required (Bearer token)

**Note:** The `addToCart` API allows users to add products to their cart. The behavior differs for combo and solo products:
- **Combo Products (`isCombo: true`):** No `skuId` needed - all SKUs in the combo are included automatically
- **Solo Products (`isCombo: false`):** `skuId` is optional but recommended - if not provided, the first SKU will be used

### Example 1: Add Combo Product to Cart
**Request Payload:**
```json
{
  "productId": "69077bd97edef95cdbd496d0",
  "quantity": 2
  // No skuId needed for combo products
}
```

**Response:**
```json
{
  "cart": {
    "_id": "691d88fb048fefa935ef9234",
    "user": "69175407176e27861c9aab5c",
    "items": [
      {
        "_id": "691d88fb048fefa935ef9235",
        "product": "69077bd97edef95cdbd496d0",
        "sku": null,
        "quantity": 2,
        "unitPrice": 3000,
        "subtotal": 6000,
        "productTitle": "Winter Care Bundle",
        "skuTitle": null,
        "image": "https://example.com/images/winter-combo-1.jpg",
        "isCombo": true,
        "components": [
          {
            "sku": "6904eb63229e6a88a246ad08",
            "quantity": 1
          },
          {
            "sku": "6904eb84229e6a88a246ad0b",
            "quantity": 1
          },
          {
            "sku": "6904eb9d229e6a88a246ad0e",
            "quantity": 1
          }
        ]
      }
    ],
    "subtotal": 6000,
    "totalQuantity": 2,
    "currency": "AUD",
    "createdAt": "2024-11-17T19:00:00.000Z",
    "updatedAt": "2024-11-17T19:00:00.000Z"
  }
}
```

### Example 2: Add Solo Product to Cart (with skuId - Recommended)
**Request Payload:**
```json
{
  "productId": "69077bd97edef95cdbd496c9",
  "quantity": 3,
  "skuId": "6904eb84229e6a88a246ad0b"
  // skuId specifies which variant (5L) to add
}
```

**Response:**
```json
{
  "cart": {
    "_id": "691d88fb048fefa935ef9234",
    "user": "69175407176e27861c9aab5c",
    "items": [
      {
        "_id": "691d88fb048fefa935ef9236",
        "product": "69077bd97edef95cdbd496c9",
        "sku": "6904eb84229e6a88a246ad0b",
        "quantity": 3,
        "unitPrice": 800,
        "subtotal": 2400,
        "productTitle": "Shampoo",
        "skuTitle": "Shampoo 5 Litre",
        "image": "https://example.com/images/shampoo-5l.jpg",
        "isCombo": false,
        "components": null
      }
    ],
    "subtotal": 2400,
    "totalQuantity": 3,
    "currency": "AUD",
    "createdAt": "2024-11-17T19:05:00.000Z",
    "updatedAt": "2024-11-17T19:05:00.000Z"
  }
}
```

### Example 3: Add Solo Product to Cart (without skuId - Uses First SKU)
**Request Payload:**
```json
{
  "productId": "6914c2638b8f7bdcfabf6cc2",
  "quantity": 1
  // No skuId - will use first SKU (250g variant)
}
```

**Response:**
```json
{
  "cart": {
    "_id": "691d88fb048fefa935ef9234",
    "user": "69175407176e27861c9aab5c",
    "items": [
      {
        "_id": "691d88fb048fefa935ef9237",
        "product": "6914c2638b8f7bdcfabf6cc2",
        "sku": "6909cf5732bc97d775a3f2db",
        "quantity": 1,
        "unitPrice": 50,
        "subtotal": 50,
        "productTitle": "Soap",
        "skuTitle": "Soap 250g",
        "image": "https://example.com/images/soap-250g.jpg",
        "isCombo": false,
        "components": null
      }
    ],
    "subtotal": 50,
    "totalQuantity": 1,
    "currency": "AUD",
    "createdAt": "2024-11-17T19:10:00.000Z",
    "updatedAt": "2024-11-17T19:10:00.000Z"
  }
}
```

### Example 4: Add Multiple Items to Cart (Mixed: Combo + Solo)
**Request Payload 1 (Add Combo):**
```json
POST /api/cart/items
{
  "productId": "69077bd97edef95cdbd496d0",
  "quantity": 1
}
```

**Request Payload 2 (Add Solo with Variant):**
```json
POST /api/cart/items
{
  "productId": "6914c2638b8f7bdcfabf6cc2",
  "quantity": 2,
  "skuId": "6909cf6832bc97d775a3f2dc"
}
```

**Final Cart Response:**
```json
{
  "cart": {
    "_id": "691d88fb048fefa935ef9234",
    "user": "69175407176e27861c9aab5c",
    "items": [
      {
        "_id": "691d88fb048fefa935ef9235",
        "product": "69077bd97edef95cdbd496d0",
        "sku": null,
        "quantity": 1,
        "unitPrice": 3000,
        "subtotal": 3000,
        "productTitle": "Winter Care Bundle",
        "skuTitle": null,
        "image": "https://example.com/images/winter-combo-1.jpg",
        "isCombo": true,
        "components": [
          {
            "sku": "6904eb63229e6a88a246ad08",
            "quantity": 1
          },
          {
            "sku": "6904eb84229e6a88a246ad0b",
            "quantity": 1
          },
          {
            "sku": "6904eb9d229e6a88a246ad0e",
            "quantity": 1
          }
        ]
      },
      {
        "_id": "691d88fb048fefa935ef9238",
        "product": "6914c2638b8f7bdcfabf6cc2",
        "sku": "6909cf6832bc97d775a3f2dc",
        "quantity": 2,
        "unitPrice": 90,
        "subtotal": 180,
        "productTitle": "Soap",
        "skuTitle": "Soap 500g",
        "image": "https://example.com/images/soap-500g.jpg",
        "isCombo": false,
        "components": null
      }
    ],
    "subtotal": 3180,
    "totalQuantity": 3,
    "currency": "AUD",
    "createdAt": "2024-11-17T19:00:00.000Z",
    "updatedAt": "2024-11-17T19:15:00.000Z"
  }
}
```

### Important Notes:

1. **Updating Existing Items:**
   - If the same product (and same SKU for solo products) is added again, the quantity is **updated** (not added)
   - For combo products: matching is by product only
   - For solo products: matching is by product + SKU

2. **Stock Validation:**
   - The API validates stock availability before adding items
   - Returns error if insufficient stock

3. **Quantity:**
   - Must be a positive integer
   - Defaults to 1 if not provided

4. **Price Calculation:**
   - Combo products: Uses product's `price` field
   - Solo products: Uses product's `price` or SKU's `mrp` (whichever is available)

### Error Responses:

**1. Missing productId:**
```json
{
  "message": "productId is required",
  "status": 400
}
```

**2. Invalid productId:**
```json
{
  "message": "Invalid productId",
  "status": 400
}
```

**3. Product not found:**
```json
{
  "message": "Product not found",
  "status": 404
}
```

**4. Invalid skuId for product:**
```json
{
  "message": "SKU 6909cf5732bc97d775a3f2db does not belong to this product",
  "status": 400
}
```

**5. Insufficient stock:**
```json
{
  "message": "Insufficient stock for Shampoo 5 Litre. Available: 2, Requested: 3",
  "status": 400
}
```

**6. Inactive product/SKU:**
```json
{
  "message": "Product is inactive",
  "status": 400
}
```

```json
{
  "message": "Selected SKU is inactive",
  "status": 400
}
```

---