import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order';
import Inventory from '../models/Inventory';
import { generateVerificationCode } from '../utils/idGenerator';

// CREATE ORDER
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, vendorId, items, paymentMethod } = req.body; // items: [{ sku, quantity, price }]
  
  let total = 0;
  items.forEach((it: any) => total += it.price * it.quantity);

  const verificationCode = paymentMethod === 'pickup' ? generateVerificationCode() : undefined;

  const order = await Order.create({
    user: userId,
    vendor: vendorId,
    items,
    totalAmount: total,
    paymentMethod,
    status: paymentMethod === 'pickup' ? 'pending_pickup' : 'placed',
    verificationCode,
  });

  // Reduce inventory for vendor
  for (const it of items) {
    const inv = await Inventory.findOne({ sku: it.sku, vendor: vendorId });
    if (inv) {
      inv.quantity = Math.max(0, inv.quantity - it.quantity);
      await inv.save();
    }
  }

  res.status(201).json(order);
});

// VERIFY PICKUP ORDER
export const verifyPickup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, code } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.verificationCode !== code) {
    res.status(400).json({ message: 'Invalid code' });
    return;
  }

  order.status = 'completed';
  await order.save();

  res.json(order);
});

// GET ALL ORDERS
export const getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const orders = await Order.find()
    .populate('user')
    .populate('vendor')
    .populate('items.sku');

  res.json(orders);
});
