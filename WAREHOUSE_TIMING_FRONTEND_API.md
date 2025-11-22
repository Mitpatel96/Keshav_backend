# Warehouse Timing API - Frontend Integration Guide

## Base URL
All endpoints are prefixed with: `/api/warehouse-timings`

---

## Quick Reference - Working Examples

### POST API - Quick Mode Example

**Endpoint:** `POST /api/warehouse-timings`

**Request:**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-21",
  "selectedDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```

**Response:**
```json
{
  "message": "Warehouse timings updated successfully. Users with pending orders have been notified.",
  "warehouseTiming": {
    "_id": "6920aba5597cf29de2312173",
    "vendor": {
      "_id": "690263b16d9ee5a0db0c5905",
      "name": "Milk Point",
      "phone": "+91-90974233290",
      "email": "milkpoint@yopmail.com"
    },
    "weekStartDate": "2025-11-170:00.000Z",
    "weekEndDate": "2025T00:0-11-23T23:59:59.999Z",
    "timings": [...],
    "isLocked": false,
    "createdAt": "2025-11-21T18:12:53.620Z",
    "updatedAt": "2025-11-21T18:13:31.068Z"
  },
  "emailsSent": 0
}
```

### GET API - Specific Week Example

**Endpoint:** `GET /api/warehouse-timings/vendor/690263b16d9ee5a0db0c5905?weekStartDate=2025-11-21`

**Response:**
```json
{
  "_id": "6920a915597cf29de231216f",
  "weekStartDate": "2025-11-16T18:30:00.000Z",
  "vendor": {
    "_id": "690263b16d9ee5a0db0c5905",
    "name": "Milk Point",
    "phone": "+91-90974233290",
    "email": "milkpoint@yopmail.com"
  },
  "weekEndDate": "2025-11-23T18:29:59.999Z",
  "timings": [...],
  "isLocked": false,
  "createdAt": "2025-11-21T18:01:57.666Z",
  "updatedAt": "2025-11-21T18:06:04.090Z"
}
```

---

## 1. Add or Update Warehouse Timings

**Endpoint:** `POST /api/warehouse-timings`

**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Method 1: Traditional - Full Week Timings

**Request Payload:**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-24",
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

**Response (201 - Created):**
```json
{
  "message": "Warehouse timings added successfully",
  "warehouseTiming": {
    "_id": "6920a915597cf29de231216f",
    "vendor": {
      "_id": "690263b16d9ee5a0db0c5905",
      "name": "Milk Point",
      "phone": "+91-90974233290",
      "email": "milkpoint@yopmail.com"
    },
    "weekStartDate": "2025-11-24T00:00:00.000Z",
    "weekEndDate": "2025-11-30T23:59:59.999Z",
    "timings": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "..."
      }
      // ... other days
    ],
    "isLocked": false,
    "createdAt": "2025-11-21T18:01:57.666Z",
    "updatedAt": "2025-11-21T18:01:57.666Z"
  }
}
```

**Response (200 - Updated):**
```json
{
  "message": "Warehouse timings updated successfully. Users with pending orders have been notified.",
  "warehouseTiming": {
    "_id": "6920a915597cf29de231216f",
    "vendor": {...},
    "weekStartDate": "2025-11-24T00:00:00.000Z",
    "weekEndDate": "2025-11-30T23:59:59.999Z",
    "timings": [...],
    "isLocked": false,
    "updatedAt": "2025-11-21T18:06:04.090Z"
  },
  "emailsSent": 5
}
```

### Method 2: Quick Mode - Select Days & Apply Same Timing

**Request Payload:**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-21",
  "selectedDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```

**Actual Response:**
```json
{
  "message": "Warehouse timings updated successfully. Users with pending orders have been notified.",
  "warehouseTiming": {
    "_id": "6920aba5597cf29de2312173",
    "vendor": {
      "_id": "690263b16d9ee5a0db0c5905",
      "name": "Milk Point",
      "phone": "+91-90974233290",
      "email": "milkpoint@yopmail.com"
    },
    "weekStartDate": "2025-11-17T00:00:00.000Z",
    "__v": 0,
    "createdAt": "2025-11-21T18:12:53.620Z",
    "isLocked": false,
    "timings": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8632"
      },
      {
        "day": "tuesday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8633"
      },
      {
        "day": "wednesday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8634"
      },
      {
        "day": "thursday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8635"
      },
      {
        "day": "friday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8636"
      },
      {
        "day": "saturday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8637"
      },
      {
        "day": "sunday",
        "startTime": "09:00",
        "endTime": "18:00",
        "isOpen": true,
        "_id": "6920abcbc60c88ea6deb8638"
      }
    ],
    "updatedAt": "2025-11-21T18:13:31.068Z",
    "weekEndDate": "2025-11-23T23:59:59.999Z"
  },
  "emailsSent": 0
}
```

**Example - Set Only Thursday and Friday:**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-24",
  "selectedDays": ["thursday", "friday"],
  "defaultTiming": {
    "startTime": "09:00",
    "endTime": "18:00",
    "isOpen": true
  }
}
```

**Example - Set Weekend Timings:**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-24",
  "selectedDays": ["saturday", "sunday"],
  "defaultTiming": {
    "startTime": "10:00",
    "endTime": "16:00",
    "isOpen": true
  }
}
```

### Method 3: Partial Update - Update Only Specific Days

**Request Payload (Update only Saturday & Sunday):**
```json
{
  "vendorId": "690263b16d9ee5a0db0c5905",
  "weekStartDate": "2025-11-24",
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

**Note:** When updating existing timings, you only need to provide the days you want to update. Other days will remain unchanged.

---

## 2. Get Warehouse Timings for Current Week

**Endpoint:** `GET /api/warehouse-timings/vendor/:vendorId`

**Authentication:** Not required (Public)

**URL Example:**
```
GET /api/warehouse-timings/vendor/690263b16d9ee5a0db0c5905
```

**Response (200):**
```json
{
  "_id": "6920a915597cf29de231216f",
  "vendor": {
    "_id": "690263b16d9ee5a0db0c5905",
    "name": "Milk Point",
    "phone": "+91-90974233290",
    "email": "milkpoint@yopmail.com"
  },
  "weekStartDate": "2025-11-17T00:00:00.000Z",
  "weekEndDate": "2025-11-23T23:59:59.999Z",
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637151"
    },
    {
      "day": "tuesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637152"
    },
    {
      "day": "wednesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637153"
    },
    {
      "day": "thursday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637154"
    },
    {
      "day": "friday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637155"
    },
    {
      "day": "saturday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637156"
    },
    {
      "day": "sunday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637157"
    }
  ],
  "isLocked": false,
  "createdAt": "2025-11-21T18:01:57.666Z",
  "updatedAt": "2025-11-21T18:06:04.090Z"
}
```

**Error Response (404):**
```json
{
  "message": "Warehouse timings not found for this week"
}
```

---

## 3. Get Warehouse Timings for Specific Week

**Endpoint:** `GET /api/warehouse-timings/vendor/:vendorId?weekStartDate=YYYY-MM-DD`

**Authentication:** Not required (Public)

**URL Examples:**
```
GET /api/warehouse-timings/vendor/690263b16d9ee5a0db0c5905?weekStartDate=2025-11-24
GET /api/warehouse-timings/vendor/690263b16d9ee5a0db0c5905?weekStartDate=2025-11-21
```

**Actual Response:**
```json
{
  "_id": "6920a915597cf29de231216f",
  "weekStartDate": "2025-11-16T18:30:00.000Z",
  "vendor": {
    "_id": "690263b16d9ee5a0db0c5905",
    "name": "Milk Point",
    "phone": "+91-90974233290",
    "email": "milkpoint@yopmail.com"
  },
  "__v": 0,
  "createdAt": "2025-11-21T18:01:57.666Z",
  "isLocked": false,
  "timings": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637151"
    },
    {
      "day": "tuesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637152"
    },
    {
      "day": "wednesday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637153"
    },
    {
      "day": "thursday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637154"
    },
    {
      "day": "friday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637155"
    },
    {
      "day": "saturday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637156"
    },
    {
      "day": "sunday",
      "startTime": "09:00",
      "endTime": "18:00",
      "isOpen": true,
      "_id": "6920aa0ce67189ad6c637157"
    }
  ],
  "updatedAt": "2025-11-21T18:06:04.090Z",
  "weekEndDate": "2025-11-23T18:29:59.999Z"
}
```

---

## 4. Get All Warehouse Timings (All Weeks)

**Endpoint:** `GET /api/warehouse-timings/vendor/:vendorId/all`

**Authentication:** Not required (Public)

**URL Example:**
```
GET /api/warehouse-timings/vendor/690263b16d9ee5a0db0c5905/all
```

**Response (200):**
```json
{
  "data": [
    {
      "_id": "6920a915597cf29de231216f",
      "vendor": {
        "_id": "690263b16d9ee5a0db0c5905",
        "name": "Milk Point",
        "phone": "+91-90974233290",
        "email": "milkpoint@yopmail.com"
      },
      "weekStartDate": "2025-11-24T00:00:00.000Z",
      "weekEndDate": "2025-11-30T23:59:59.999Z",
      "timings": [...],
      "isLocked": false,
      "createdAt": "2025-11-21T18:01:57.666Z",
      "updatedAt": "2025-11-21T18:06:04.090Z"
    },
    {
      "_id": "6920a915597cf29de231216g",
      "vendor": {...},
      "weekStartDate": "2025-11-17T00:00:00.000Z",
      "weekEndDate": "2025-11-23T23:59:59.999Z",
      "timings": [...],
      "isLocked": false,
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-20T10:00:00.000Z"
    }
  ]
}
```

---

## Frontend Implementation Examples

### Example 1: Set Timings for Next Week (All Weekdays)

```javascript
const setNextWeekWeekdayTimings = async (vendorId, startTime, endTime) => {
  // Calculate next week's Monday date
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7 || 7);
  const weekStartDate = nextMonday.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const response = await fetch('/api/warehouse-timings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      vendorId: vendorId,
      weekStartDate: weekStartDate,
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      defaultTiming: {
        startTime: startTime, // e.g., "09:00"
        endTime: endTime,     // e.g., "18:00"
        isOpen: true
      }
    })
  });

  return await response.json();
};
```

### Example 2: Update Only Weekend Timings

```javascript
const updateWeekendTimings = async (vendorId, weekStartDate, saturdayTime, sundayTime) => {
  const response = await fetch('/api/warehouse-timings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      vendorId: vendorId,
      weekStartDate: weekStartDate, // e.g., "2025-11-24"
      timings: [
        {
          day: 'saturday',
          startTime: saturdayTime.start, // e.g., "10:00"
          endTime: saturdayTime.end,     // e.g., "16:00"
          isOpen: true
        },
        {
          day: 'sunday',
          startTime: sundayTime.start,   // e.g., "10:00"
          endTime: sundayTime.end,       // e.g., "14:00"
          isOpen: true
        }
      ]
    })
  });

  return await response.json();
};
```

### Example 3: Get Current Week Timings

```javascript
const getCurrentWeekTimings = async (vendorId) => {
  const response = await fetch(`/api/warehouse-timings/vendor/${vendorId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 404) {
    return null; // No timings set for current week
  }

  return await response.json();
};
```

### Example 4: Get Specific Week Timings

```javascript
const getWeekTimings = async (vendorId, date) => {
  // date format: "YYYY-MM-DD" or Date object
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  const response = await fetch(
    `/api/warehouse-timings/vendor/${vendorId}?weekStartDate=${dateStr}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  return await response.json();
};
```

### Example 5: Get All Timings (History)

```javascript
const getAllTimings = async (vendorId) => {
  const response = await fetch(`/api/warehouse-timings/vendor/${vendorId}/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.data; // Array of all warehouse timings
};
```

---

## Data Structure Reference

### Timing Object Structure:
```typescript
interface Timing {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;  // Format: "HH:mm" (24-hour), e.g., "09:00", "14:30"
  endTime: string;    // Format: "HH:mm" (24-hour), e.g., "18:00", "20:00"
  isOpen: boolean;    // Whether warehouse is open on this day
}
```

### Warehouse Timing Response Structure:
```typescript
interface WarehouseTiming {
  _id: string;
  vendor: {
    _id: string;
    name: string;
    phone: string;
    email: string;
  };
  weekStartDate: string;  // ISO date string (Monday of the week)
  weekEndDate: string;    // ISO date string (Sunday of the week)
  timings: Timing[];
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Common Use Cases for Frontend

### 1. Display Current Week Timings
```javascript
// Get current week timings
const timings = await getCurrentWeekTimings(vendorId);
if (timings) {
  // Display timings.timings array in a table/calendar
  timings.timings.forEach(timing => {
    console.log(`${timing.day}: ${timing.isOpen ? `${timing.startTime} - ${timing.endTime}` : 'Closed'}`);
  });
}
```

### 2. Set Timings for Next Week
```javascript
// Calculate next Monday
const today = new Date();
const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
const nextMonday = new Date(today);
nextMonday.setDate(today.getDate() + daysUntilMonday);
const nextMondayStr = nextMonday.toISOString().split('T')[0];

// Set all weekdays with same timing
await setNextWeekWeekdayTimings(vendorId, "09:00", "18:00");
```

### 3. Update Specific Days
```javascript
// Update only Thursday and Friday
const response = await fetch('/api/warehouse-timings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    vendorId: vendorId,
    weekStartDate: "2025-11-24",
    selectedDays: ["thursday", "friday"],
    defaultTiming: {
      startTime: "09:00",
      endTime: "18:00",
      isOpen: true
    }
  })
});
```

### 4. Form Data Structure for UI

**For a weekly timing form:**
```javascript
const formData = {
  vendorId: "690263b16d9ee5a0db0c5905",
  weekStartDate: "2025-11-24", // Selected week start date
  timings: [
    { day: "monday", startTime: "09:00", endTime: "18:00", isOpen: true },
    { day: "tuesday", startTime: "09:00", endTime: "18:00", isOpen: true },
    { day: "wednesday", startTime: "09:00", endTime: "18:00", isOpen: true },
    { day: "thursday", startTime: "09:00", endTime: "18:00", isOpen: true },
    { day: "friday", startTime: "09:00", endTime: "18:00", isOpen: true },
    { day: "saturday", startTime: "10:00", endTime: "16:00", isOpen: true },
    { day: "sunday", startTime: "00:00", endTime: "00:00", isOpen: false }
  ]
};
```

**For quick mode (select days):**
```javascript
const quickModeData = {
  vendorId: "690263b16d9ee5a0db0c5905",
  weekStartDate: "2025-11-24",
  selectedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  defaultTiming: {
    startTime: "09:00",
    endTime: "18:00",
    isOpen: true
  }
};
```

---

## Important Notes for Frontend

1. **Date Format**: Always use `YYYY-MM-DD` format for `weekStartDate`
2. **Time Format**: Always use `HH:mm` format (24-hour) for times, e.g., "09:00", "18:00"
3. **Day Names**: Must be lowercase: "monday", "tuesday", etc.
4. **Partial Updates**: When updating existing timings, only send the days you want to change
5. **Quick Mode**: Use `selectedDays` + `defaultTiming` to apply same timing to multiple days at once
6. **No Body for GET**: GET requests don't have a request body, use URL and query parameters only

---

## Error Handling

**400 Bad Request:**
```json
{
  "message": "vendorId and timings array are required"
}
```

**403 Forbidden:**
```json
{
  "message": "You can only set timings for your own vendor account"
}
```

**404 Not Found:**
```json
{
  "message": "Vendor not found"
}
```
or
```json
{
  "message": "Warehouse timings not found for this week"
}
```

