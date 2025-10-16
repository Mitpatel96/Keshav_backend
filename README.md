# Keshav Admin & Vendor Panel API v3.0

This is the backend API for the Keshav Admin & Vendor Panel system, implementing all features as specified in version 3.0 of the requirements.

## Features Implemented

### Admin Panel Features
1. **Dashboard Overview**
   - Total Sales Chart
   - Best Selling Products
   - Total Vendor Accounts
   - Total Users
   - Total SKUs
   - Total Inventory Stock
   - Best Pickup Points
   - Total Collected Amount
   - Best Timing to Buy
   - Total Orders
   - Low Stock Alerts
   - Recent Damage/Loss Tickets

2. **User Management**
   - Add New User with auto-generated ID
   - User List View with filtering
   - Update User Details
   - User Order History
   - User Feedback Logs

3. **Inventory Management**
   - Add SKU with variants
   - Add Inventory with vendor linkage
   - Show Inventory with available quantity
   - Update Inventory (price, quantity, vendor)
   - Lost/Damaged Items tracking
   - Inventory Summary
   - Stock History Log
   - Low Stock Alerts with notifications

4. **Pickup Points & Vendor Management**
   - Add Pickup Point
   - Assign Vendors to Pickup Points
   - Add SKU to Vendor
   - Vendor Payment Collation
   - Deactivate Vendor
   - Vendor Details View with performance metrics

5. **Vendor Inventory Flow**
   - Admin assigns inventory (Pending status)
   - Vendor confirms delivery (Success status)
   - Vendor adds damage/loss report
   - Admin approves damage ticket
   - Real-time stock updates

6. **Promotional Management**
   - Create Promo Codes
   - Set Discount Type (% or fixed)
   - Define Usage Rules
   - Set Expiry Date
   - Track Usage
   - Update/Delete Promo
   - Auto-disable on expiry

7. **Order Management**
   - User Orders Today
   - Pending Pickup Orders
   - Order Verification System
   - Sales Filter
   - Pickup Performance
   - Refund/Cancel Requests
   - Invoice Download

8. **Payment & Accounting**
   - Vendor Payment Collection
   - Direct Sale Collection
   - Commission & Tax Deduction
   - Generate Vendor Payout Report
   - Auto Payment Status
   - Download Report

9. **Reports & Analytics**
   - Sales Report
   - Inventory Report
   - Damage/Loss Report
   - Promo Code Report
   - Top Products
   - User Growth Report

10. **Settings**
    - Manage Location Data
    - Pickup Point Mapping
    - User Role Management
    - Notification Settings

### Vendor Panel Features
1. **Inventory & Order Management**
   - View Total Stock
   - Receive Inventory (Confirm Delivery)
   - Verify Orders
   - Generate Bill (Walk-in Sale)
   - Auto Stock Deduction
   - Request Damage/Loss
   - Pending Orders
   - Completed Orders
   - Sales Summary

2. **Sales Tracking & Reports**
   - Direct Sales Report
   - Online Order Report
   - Pending vs. Delivered
   - Best Selling SKU Report
   - Inventory Health Report
   - Vendor Commission Overview

3. **Vendor Profile & Support**
   - View Vendor Profile
   - Edit Basic Info
   - Raise Support Ticket
   - Notification Center
   - Vendor Guidelines

## API Endpoints

For a complete list of API endpoints, please refer to the [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) file.

## Technology Stack
- Node.js
- Express.js
- TypeScript
- MongoDB with Mongoose
- JSON Web Tokens (JWT) for authentication

## Setup Instructions
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in a `.env` file
4. Run the development server: `npm run dev`

## Build for Production
- Compile TypeScript: `npm run build`
- Start production server: `npm start`

## License
This project is proprietary and confidential.