# Warehouse Timing API Documentation

## Base URL
All endpoints are prefixed with: `/api/warehouse-timings`

---

## 1. Add or Update Vendor Warehouse Timings

**Endpoint:** `POST /api/warehouse-timings`

**Authentication:** Required (Protected route - Vendor or Admin)

**Description:** 
- Add new warehouse timings for a vendor
- Update existing warehouse timings for a vendor (full or partial update)
- **Partial Updates**: If timings already exist for a week, you can update only specific days (e.g., just Saturday and Sunday). The system will merge your updates with existing timings.
- **When timings are updated, all users with pending orders from that vendor will automatically receive an email notification**
- Vendors can update timings anytime for any week (no restrictions)
- Past dates are not allowed

**Request Body (Method 1 - Traditional):**
```json
{
  "vendorId": "507f1f77bcf86cd799439011",
  "weekStartDate": "2024-01-16",  // Optional: Any date within the week (defaults to current week)
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    {
      "day": "tuesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    {
      "day": "wednesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    {
      "day": "thursday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    {
      "day": "friday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    {
      "day": "saturday",
      "startTime": "10:00",
      "endTime": "16:00",
      "isOpen": true
    },
    {
      "day": "sunday",
      "startTime": "00:00",
      "endTime": "00:00",
      "isOpen": false
    }
  ]
}
```

**Request Body (Method 2 - Quick Mode: Select Days & Apply Same Timing):**
```json
{
  "vendorId": "507f1f77bcf86cd799439011",
  "weekStartDate": "2024-01-22",  // Required: Date from next week
  "selectedDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```
**Note**: This method applies the same timing to all selected days. Perfect for setting timings for multiple days at once.

**Example - Select Only Thursday and Friday:**
```json
{
  "vendorId": "507f1f77bcf86cd799439011",
  "weekStartDate": "2024-01-22",
  "selectedDays": ["thursday", "friday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```
**Result**: Sets the same timing (09:00-18:00) for only Thursday and Friday of that week. Other days remain unchanged if they exist.

**Request Parameters:**
- `vendorId` (required): MongoDB ObjectId of the vendor
- `weekStartDate` (optional): Date string (YYYY-MM-DD). 
  - If not provided, defaults to current week's Monday
  - If provided, can be any date (today or future) - the system will automatically calculate the Monday of that week
  - **Examples:**
    - Pass tomorrow's date → Sets timings for the week containing tomorrow
    - Pass a date in next week → Sets timings for next week
    - Pass today's date → Sets timings for current week
    - **Past dates are not allowed**

**Method 1 - Traditional (timings array):**
- `timings` (required if not using Method 2): Array of timing objects
  - `day` (required): One of: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  - `startTime` (required): Time in HH:mm format (24-hour, e.g., "09:00", "14:30")
  - `endTime` (required): Time in HH:mm format (24-hour, e.g., "18:00", "20:00")
  - `isOpen` (optional): Boolean, defaults to true
  - **Note**: 
    - For **new timings**: You must provide all 7 days (Monday through Sunday)
    - For **updating existing timings**: You can provide only the days you want to update (partial update). The system will merge your updates with existing timings.

**Method 2 - Quick Mode (selectedDays + defaultTiming):**
- `selectedDays` (required if using Method 2): Array of day names you want to set timings for
  - Example: `["monday", "tuesday", "wednesday", "thursday", "friday"]`
  - All selected days will receive the same timing from `defaultTiming`
- `defaultTiming` (required if using Method 2): Single timing object to apply to all selected days
  - `startTime` (required): Time in HH:mm format (24-hour, e.g., "09:00")
  - `endTime` (required): Time in HH:mm format (24-hour, e.g., "18:00")
  - `isOpen` (optional): Boolean, defaults to true

**Success Response (201 - Created):**
```json
{
  "message": "Warehouse timings added successfully",
  "warehouseTiming": {
    "_id": "507f1f77bcf86cd799439012",
    "vendor": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Vendor Name",
      "phone": "1234567890",
      "email": "vendor@example.com"
    },
    "weekStartDate": "2024-01-15T00:00:00.000Z",
    "weekEndDate": "2024-01-21T23:59:59.999Z",
    "timings": [...],
    "isLocked": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Success Response (200 - Updated):**
```json
{
  "message": "Warehouse timings updated successfully. Users with pending orders have been notified.",
  "warehouseTiming": {
    "_id": "507f1f77bcf86cd799439012",
    "vendor": {...},
    "weekStartDate": "2024-01-15T00:00:00.000Z",
    "weekEndDate": "2024-01-21T23:59:59.999Z",
    "timings": [...],
    "isLocked": false,
    "updatedAt": "2024-01-16T14:30:00.000Z"
  },
  "emailsSent": 5
}
```

**Error Responses:**
- `400`: Invalid request (missing fields, invalid day, invalid time format, past date provided)
- `403`: Vendor trying to update another vendor's timings
- `404`: Vendor not found

**Example cURL Requests:**

**1. Set timings for current week (default):**
```bash
curl -X POST http://localhost:5000/api/warehouse-timings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vendorId": "507f1f77bcf86cd799439011",
    "timings": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true
      }
    ]
  }'
```

**2. Set timings for tomorrow (or any specific date):**
```bash
curl -X POST http://localhost:5000/api/warehouse-timings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vendorId": "507f1f77bcf86cd799439011",
    "weekStartDate": "2024-01-16",
    "timings": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true
      }
    ]
  }'
```

**3. Set timings for next week:**
```bash
curl -X POST http://localhost:5000/api/warehouse-timings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vendorId": "507f1f77bcf86cd799439011",
    "weekStartDate": "2024-01-22",
    "timings": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true
      }
    ]
  }'
```

---

## 2. Get Warehouse Timings for a Vendor (Current Week)

**Endpoint:** `GET /api/warehouse-timings/vendor/:vendorId`

**Authentication:** Not required (Public)

**Description:** Get warehouse timings for a specific vendor for the current week (or specified week)

**URL Parameters:**
- `vendorId` (required): MongoDB ObjectId of the vendor

**Query Parameters:**
- `weekStartDate` (optional): Date string (YYYY-MM-DD) - Get timings for a specific week

**Success Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "vendor": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Vendor Name",
    "phone": "1234567890",
    "email": "vendor@example.com"
  },
  "weekStartDate": "2024-01-15T00:00:00.000Z",
  "weekEndDate": "2024-01-21T23:59:59.999Z",
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    ...
  ],
  "isLocked": false,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `400`: vendorId is required
- `404`: Vendor not found or Warehouse timings not found for this week

**Example cURL:**
```bash
# Get current week timings
curl http://localhost:5000/api/warehouse-timings/vendor/507f1f77bcf86cd799439011

# Get specific week timings
curl "http://localhost:5000/api/warehouse-timings/vendor/507f1f77bcf86cd799439011?weekStartDate=2024-01-22"
```

---

## 3. Get All Warehouse Timings for a Vendor

**Endpoint:** `GET /api/warehouse-timings/vendor/:vendorId/all`

**Authentication:** Not required (Public)

**Description:** Get all warehouse timings for a specific vendor (all weeks)

**URL Parameters:**
- `vendorId` (required): MongoDB ObjectId of the vendor

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "vendor": {...},
      "weekStartDate": "2024-01-15T00:00:00.000Z",
      "weekEndDate": "2024-01-21T23:59:59.999Z",
      "timings": [...],
      "isLocked": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "vendor": {...},
      "weekStartDate": "2024-01-22T00:00:00.000Z",
      "weekEndDate": "2024-01-28T23:59:59.999Z",
      "timings": [...],
      "isLocked": false,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400`: vendorId is required
- `404`: Vendor not found

**Example cURL:**
```bash
curl http://localhost:5000/api/warehouse-timings/vendor/507f1f77bcf86cd799439011/all
```

---

## Order History API

**Endpoint:** `GET /api/orders/user/:userId/history`

**Authentication:** Required (Protected route)

**Description:** Get order history for a user with status `pending_verification`. Includes vendor phone number.

**URL Parameters:**
- `userId` (required): MongoDB ObjectId of the user

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "orderCode": "ORD-1234567890-123",
      "orderVFC": "ABC123",
      "status": "pending_verification",
      "totalAmount": 1500,
      "discountAmount": 100,
      "promoCode": "SAVE100",
      "vendor": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Vendor Name",
        "email": "vendor@example.com",
        "phone": "1234567890"
      },
      "vendorPhone": "1234567890",
      "items": [
        {
          "sku": {
            "_id": "507f1f77bcf86cd799439030",
            "title": "Product SKU Name"
          },
          "quantity": 2,
          "price": 500
        }
      ],
      "orderType": "online",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error Responses:**
- `400`: userId is required or Invalid userId
- `403`: Not authorized to view other users orders

**Example cURL:**
```bash
curl -X GET "http://localhost:5000/api/orders/user/507f1f77bcf86cd799439010/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Important Notes

1. **Email Notifications**: When a vendor updates warehouse timings (not on first creation), all users with `pending_verification` orders from that vendor will automatically receive an email with the updated timings.

2. **No Restrictions**: Vendors can update warehouse timings anytime for any week. There are no deadline restrictions.

3. **Week Calculation**: 
   - The system automatically calculates the Monday and Sunday of the week based on the provided date or current date
   - If you provide `weekStartDate` as "2024-01-16" (Tuesday), it will calculate the Monday of that week (2024-01-15) and set timings for the entire week (Monday to Sunday)
   - You can pass any date within a week to set timings for that week

4. **Date Validation**: 
   - Past dates are not allowed
   - Only today's date or future dates are accepted
   - If you try to set timings for a past date, you'll get a 400 error

5. **Use Cases**:
   - **New vendor added today**: Don't provide `weekStartDate` → Sets timings for current week
   - **Set timings for tomorrow**: Provide tomorrow's date in `weekStartDate` → Sets timings for the week containing tomorrow
   - **Set timings for next week**: Provide any date from next week → Sets timings for next week
   - **Update current week timings**: Don't provide `weekStartDate` or provide today's date → Updates current week timings

6. **Time Format**: All times must be in 24-hour format (HH:mm), e.g., "09:00", "14:30", "18:00".

7. **Day Names**: Day names must be lowercase: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".

## Examples

### Example 1: New Vendor Setting Timings for Current Week
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    // ... rest of the week
  ]
}
```
**Result**: Sets timings for current week (Monday to Sunday)

### Example 2: Vendor Setting Timings for Tomorrow
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2024-01-16",
  "timings": [
    {
      "day": "tuesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    // ... rest of the week
  ]
}
```
**Result**: If tomorrow is Tuesday, sets timings for current week. If tomorrow is next Monday, sets timings for next week.

### Example 3: Vendor Setting Timings for Next Week
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2024-01-22",
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true
    },
    // ... rest of the week
  ]
}
```
**Result**: Sets timings for next week (Monday to Sunday)

### Example 4: Partial Update - Setting Timings Only for Remaining Days (Saturday & Sunday)
**Scenario**: Today is Friday, November 21, 2025. You already have timings set for Monday-Friday, and you want to update only Saturday and Sunday timings.

**Payload (Partial Update - Only Saturday & Sunday):**
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2025-11-21",
  "timings": [
    {
      "day": "saturday",
      "startTime": "10:00",
      "endTime": "16:00",
      "isOpen": true
    },
    {
      "day": "sunday",
      "startTime": "10:00",
      "endTime": "14:00",
      "isOpen": true
    }
  ]
}
```
**Result**: 
- Updates only Saturday and Sunday timings
- Keeps existing Monday-Friday timings unchanged
- Sets timings for the current week (Monday, Nov 17 to Sunday, Nov 23)
- Since timings already exist for this week, this is a **partial update**

**Important for Partial Updates**:
- You only need to provide the days you want to update
- Existing timings for other days will remain unchanged
- The system automatically merges your updates with existing timings
- You still need to provide `weekStartDate` to identify which week to update

### Example 5: Quick Mode - Select Days from Next Week and Apply Same Timing
**Scenario**: Today is Friday, November 21, 2025. You want to set timings for next week's weekdays (Monday-Friday) with the same timing.

**Payload (Quick Mode):**
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2025-11-24",
  "selectedDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```
**Result**: 
- Sets the same timing (09:00-18:00) for all selected days (Monday-Friday) of next week
- If timings already exist for next week, it will update only the selected days
- Other days (Saturday, Sunday) remain unchanged if they exist

**Another Example - Setting Weekend Timings:**
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2025-11-24",
  "selectedDays": ["saturday", "sunday"],
  "defaultTiming": {
    "startTime": "10:00",
    "endTime": "16:00",
    "isOpen": true
  }
}
```
**Result**: Sets 10:00-16:00 timing for both Saturday and Sunday of next week.

**Example - Select Only Thursday and Friday:**
```json
{
  "vendorId": "69024074c72ba1dcb46c84c6",
  "weekStartDate": "2025-11-24",
  "selectedDays": ["thursday", "friday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```
**Result**: 
- Sets the same timing (09:00-18:00) for only Thursday and Friday of next week
- Other days (Monday, Tuesday, Wednesday, Saturday, Sunday) remain unchanged if they exist
- Perfect for updating just specific days with the same timing

