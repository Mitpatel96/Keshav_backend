import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order';
import Inventory from '../models/Inventory';
import Sku from '../models/Sku';
import { generateSixDigitAlphaNumericCode } from '../utils/idGenerator';
import InventoryHistory from '../models/InventoryHistory';
import CashAmount from '../models/CashAmount';
import CashDeductionHistory from '../models/CashDeductionHistory';
import Vendor from '../models/Vendor';
import User from '../models/User';
import { sendMail } from '../services/mailService';

// 1. User purchases online product
export const createOnlineOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, vendorId, items, paymentMethod } = req.body;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const sku = await Sku.findById(item.itemId);
    if (!sku) {
      res.status(404).json({ message: `SKU with id ${item.itemId} not found` });
      return;
    }

    const price = sku.mrp || 0;
    const quantity = item.quantity || 0;

    orderItems.push({
      sku: item.itemId,
      quantity: quantity,
      price: price
    });

    total += price * quantity;
  }

  const orderVFC = generateSixDigitAlphaNumericCode();
  const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const order = await Order.create({
      user: userId,
      vendor: vendorId,
      items: orderItems,
      totalAmount: total,
      paymentMethod: 'online',
      status: 'pending_verification',
      orderVFC,
      orderCode,
      pickupAddress: vendor.address[0],
      orderType: 'online'
    });

    try {
      await sendMail({
        to: user.email,
        subject: 'Order Verification Code',
        html: `<p>Your order verification code is: <strong>${orderVFC}</strong></p>
               <p>Please present this code when picking up your order at the vendor location.</p>`
      });
    } catch (error) {
      console.error('Failed to send order verification email:', error);
    }

    res.status(201).json(order);
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];

      res.status(400).json({
        message: `Duplicate key error: ${duplicateField} with value '${duplicateValue}' already exists`,
        error: 'DUPLICATE_KEY_ERROR',
        field: duplicateField,
        value: duplicateValue
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        error: error.message,
        details: Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      });
      return;
    }

    console.error('Error creating order:', error);
    res.status(500).json({
      message: 'Internal server error while creating order',
      error: error.message
    });
  }
});

// 2. Vendor verifies order using orderVFC
export const verifyOrderWithVFC = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderVFC } = req.body;

  // Find order by orderVFC
  const order = await Order.findOne({ orderVFC }).populate('user').populate('vendor');
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.status !== 'pending_verification') {
    res.status(400).json({ message: 'Order is not pending verification' });
    return;
  }

  res.json({
    message: 'Order verified successfully',
    order
  });
});

// 3. Vendor updates order status (Confirmed, Partially Rejected)
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, status, pickupAddress } = req.body;

  // Find order
  const order = await Order.findById(orderId).populate('items.sku');
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  // Update status
  const previousStatus = order.status;
  order.status = status;

  // If status is partially rejected and pickup address is provided, update it
  // if (status === 'partially_rejected' && pickupAddress) {
  //   order.pickupAddress = pickupAddress;
  // }

  await order.save();

  // If order status is changed to confirmed, reduce inventory and create history entries
  if (status === 'confirmed' && previousStatus !== 'confirmed') {

    // Reduce inventory for each item in the order
    for (const item of order.items) {
      const inventory = await Inventory.findOne({
        vendor: order.vendor,
        sku: item.sku
      });

      if (inventory) {
        const oldQuantity = inventory.quantity;
        inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
        await inventory.save();

        await InventoryHistory.create({
          inventory: inventory._id,
          sku: item.sku,
          fromVendor: order.vendor,
          quantity: item.quantity,
          type: 'deduct_from_order',
          reason: `Order ${order._id}: Sold ${item.quantity} units`,
          referenceId: order._id
        });
      }
    }
  }

  res.json({
    message: 'Order status updated successfully',
    order
  });
});

// 4.GET PARTIALLY REJECTED ORDERS FOR ADMIN
export const getPartiallyRejectedOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await Order.find({ status: 'partially_rejected' })
      .populate('user')
      .populate('vendor')
      .populate('items.sku')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Order.countDocuments({ status: 'partially_rejected' });

    res.json({
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching partially rejected orders:', error);
    res.status(500).json({ message: 'Internal server error while fetching partially rejected orders' });
  }
});

// 5. Admin updates pickup address for partially rejected orders
export const adminUpdatePickupAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, vendorId, pickupAddress } = req.body;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  // Check if order is partially rejected
  if (order.status !== 'partially_rejected') {
    res.status(400).json({ message: 'Order is not partially rejected' });
    return;
  }

  // Update vendor and pickup address
  order.vendor = vendorId;
  order.pickupAddress = pickupAddress;

  await order.save();

  res.json({
    message: 'Pickup address updated successfully',
    order
  });
});

// 11. Walk-in user creates temporary user and order
export const createWalkInOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, phone, dob, vendorId, items } = req.body;

  // Validate vendor exists
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  let user = await User.findOne({ phone, temporaryUser: true });

  if (!user) {
    const userCount = await User.countDocuments();
    const permanentId = `U${(1000 + userCount + 1).toString().slice(-4)}`;

    user = await User.create({
      permanentId,
      name,
      phone,
      dob,
      temporaryUser: true,
      role: 'user'
    });
  }

  // Calculate total amount by fetching SKU details
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    // Use itemId from the request to find the SKU
    const sku = await Sku.findById(item.itemId);
    if (!sku) {
      res.status(404).json({ message: `SKU with id ${item.itemId} not found` });
      return;
    }

    // Use the MRP from SKU as price
    const price = sku.mrp || 0;
    const quantity = item.quantity || 0;

    // Add to order items with the correct price
    orderItems.push({
      sku: item.itemId,  // Use itemId as the sku reference
      quantity: quantity,
      price: price
    });

    // Calculate total
    total += price * quantity;
  }

  const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // Generate unique order code

  try {
    const order = await Order.create({
      user: user._id,
      vendor: vendorId,
      items: orderItems, // Use the processed items with correct prices
      totalAmount: total,
      paymentMethod: 'cash',
      status: 'confirmed',
      orderCode, // Add the orderCode field
      orderType: 'walk_in'
    });

    res.status(201).json({ user, order });
  } catch (error: any) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      // Extract the field that caused the duplicate key error
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];

      res.status(400).json({
        message: `Duplicate key error: ${duplicateField} with value '${duplicateValue}' already exists`,
        error: 'DUPLICATE_KEY_ERROR',
        field: duplicateField,
        value: duplicateValue
      });
      return;
    }

    // Handle other validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        error: error.message,
        details: Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      });
      return;
    }

    // Handle other errors
    console.error('Error creating walk-in order:', error);
    res.status(500).json({
      message: 'Internal server error while creating walk-in order',
      error: error.message
    });
  }
});


// 12. GET ORDERS BY VENDOR ID
export const getOrdersByVendorId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ vendor: req.params.vendorId })
    .populate('user')
    .populate('vendor')
    .populate('items.sku')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await Order.countDocuments({ vendor: req.params.vendorId });

  res.json({
    data: orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});

// 13. Vendor generates bill for walk-in user
export const generateBill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, cashAmount } = req.body;

  // Ensure cashAmount is a number
  const cashAmountNum = Number(cashAmount);
  if (isNaN(cashAmountNum)) {
    res.status(400).json({ message: 'Invalid cash amount provided' });
    return;
  }

  const order = await Order.findById(orderId).populate('user').populate('vendor');
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  for (const item of order.items) {
    const inventory = await Inventory.findOne({
      vendor: order.vendor,
      sku: item.sku
    });

    if (inventory) {
      const oldQuantity = inventory.quantity;
      inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
      await inventory.save();

      await InventoryHistory.create({
        inventory: inventory._id,
        sku: item.sku,
        fromVendor: order.vendor,
        quantity: item.quantity,
        type: 'deduct_from_order',
        reason: `Walk-in Order ${order._id}: Sold ${item.quantity} units`,
        referenceId: order._id
      });
    }
  }

  let cashEntry = await CashAmount.findOne({ vendorId: (order.vendor as any)._id });

  if (cashEntry) {
    cashEntry.cashAmount += cashAmountNum;  // Use the numeric value
    cashEntry.orderId = order._id;
    cashEntry.billGeneratedAt = new Date();
    await cashEntry.save();
  } else {
    cashEntry = await CashAmount.create({
      vendorId: (order.vendor as any)._id,
      cashAmount: cashAmountNum,  // Use the numeric value
      orderId: order._id
    });
  }

  res.status(201).json({
    message: 'Bill generated successfully',
    order,
    cashEntry
  });
});


export const getVendorCashBalance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;

  if (!vendorId) {
    res.status(400).json({ message: 'Vendor ID is required' });
    return;
  }

  const cashEntry = await CashAmount.findOne({ vendorId });

  if (!cashEntry) {
    res.status(404).json({ message: 'Vendor cash entry not found' });
    return;
  }

  res.status(200).json({
    vendorId,
    cashAmount: cashEntry.cashAmount,
    lastUpdated: cashEntry.billGeneratedAt
  });
});


// Deduct amount when vendor purchases from admin - admin will run this api
export const deductVendorCash = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId, amount, reason } = req.body;

  const adminUser = (req as any).user;
  if (!adminUser) {
    res.status(401).json({ message: 'Unauthorized: Admin user not found' });
    return;
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum)) {
    res.status(400).json({ message: 'Invalid amount provided' });
    return;
  }

  let cashEntry = await CashAmount.findOne({ vendorId });

  if (!cashEntry) {
    res.status(404).json({ message: 'Vendor cash entry not found' });
    return;
  }

  if (cashEntry.cashAmount < amountNum) {
    res.status(400).json({ message: 'Insufficient balance in vendor cash bank' });
    return;
  }

  const previousAmount = cashEntry.cashAmount;

  cashEntry.cashAmount -= amountNum;
  cashEntry.billGeneratedAt = new Date();
  await cashEntry.save();

  await CashDeductionHistory.create({
    vendorId,
    amount: amountNum,
    deductedBy: adminUser._id,
    reason: reason || 'Cash deduction by admin',
  });

  res.status(200).json({
    message: 'Amount deducted successfully',
    cashEntry,
    deduction: {
      vendorId,
      amount: amountNum,
      previousAmount,
      newAmount: cashEntry.cashAmount,
      deductedBy: adminUser._id,
      reason: reason || 'Cash deduction by admin',
    }
  });
});

// GET CASH DEDUCTION HISTORY FOR A SPECIFIC VENDOR
export const getVendorCashDeductionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const history = await CashDeductionHistory.find({ vendorId })
      .populate('deductedBy', 'name email') // Populate admin info
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CashDeductionHistory.countDocuments({ vendorId });

    res.status(200).json({
      data: history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendor cash deduction history:', error);
    res.status(500).json({ message: 'Internal server error while fetching vendor cash deduction history' });
  }
});

// GET CASH DEDUCTION HISTORY
export const getCashDeductionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { vendorId } = req.query;
  const filter: any = {};
  if (vendorId) {
    filter.vendorId = vendorId;
  }

  try {
    const history = await CashDeductionHistory.find(filter)
      .populate('vendorId', 'name phone') // Populate vendor info
      .populate('deductedBy', 'name email') // Populate admin info
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CashDeductionHistory.countDocuments(filter);

    res.status(200).json({
      data: history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching cash deduction history:', error);
    res.status(500).json({ message: 'Internal server error while fetching cash deduction history' });
  }
});

// GET ALL ORDERS
export const getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await Order.find()
      .populate('user')
      .populate('vendor')
      .populate('items.sku')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Order.countDocuments();

    res.json({
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error while fetching orders' });
  }
});

// GET ORDER BY ID
export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id)
    .populate('user')
    .populate('vendor')
    .populate('items.sku');

  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  res.json(order);
});

// GET ORDERS BY USER ID
export const getOrdersByUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.params.userId })
    .populate('user')
    .populate('vendor')
    .populate('items.sku')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await Order.countDocuments({ user: req.params.userId });

  res.json({
    data: orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});


