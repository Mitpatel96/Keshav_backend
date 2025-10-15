// Project: Keshav Admin & Vendor Panel API (Node + TypeScript + MongoDB)
// Structure (files concatenated below). Save as a fresh project and run `npm install` then `npm run dev`.

// ---------- package.json ----------



// ---------- tsconfig.json ----------



// ---------- .env.example ----------
// MONGO_URI=mongodb://localhost:27017/keshav
// JWT_SECRET=your_jwt_secret_here
// PORT=5000


// ---------- src/index.ts ----------

// ---------- src/config/db.ts ----------

// ---------- src/models/User.ts ----------


// ---------- src/models/Vendor.ts ----------

// ---------- src/models/Sku.ts ----------

// ---------- src/models/Inventory.ts ----------

// ---------- src/models/Promo.ts ----------


// ---------- src/models/Order.ts ----------


// ---------- src/models/PickupPoint.ts ----------

// ---------- src/models/DamageTicket.ts ----------

// ---------- src/middleware/auth.ts ----------


// ---------- src/utils/idGenerator.ts ----------

// ---------- src/controllers/userController.ts ----------


// ---------- src/controllers/vendorController.ts ----------


// ---------- src/controllers/skuController.ts ----------


// ---------- src/controllers/inventoryController.ts ----------


// ---------- src/controllers/promoController.ts ----------



// ---------- src/controllers/orderController.ts ----------


// ---------- src/controllers/pickupController.ts ----------



// ---------- src/controllers/damageController.ts ----------



// ---------- src/routes/userRoutes.ts ----------


// ---------- src/routes/vendorRoutes.ts ----------



// ---------- src/routes/skuRoutes.ts ----------



// ---------- src/routes/inventoryRoutes.ts ----------


// ---------- src/routes/promoRoutes.ts ----------


// ---------- src/routes/orderRoutes.ts ----------

// ---------- src/routes/pickupRoutes.ts ----------


// ---------- src/routes/damageRoutes.ts ----------


// ---------- README.md ----------
/* # Keshav Admin API

This repository provides a starter Node + TypeScript + MongoDB API implementing Admin & Vendor flows for inventory, SKUs, vendors, pickup points, promos, orders, and damage/loss tickets.

## Quick start
1. Copy files into project
2. `npm install`
3. Create `.env` from `.env.example`
4. `npm run dev`

## Notes
- Auth is JWT-based; adminOnly middleware checks for role === 'admin'.
- For production, improve validation, error handling, rate limiting, and file uploads (documents/images).
- Extend models with more granular accounting, commission handling, and audit logs as needed.


// End of concatenated files
*/