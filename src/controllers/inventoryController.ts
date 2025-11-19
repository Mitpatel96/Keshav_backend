import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Inventory from '../models/Inventory';
import PendingInventoryTransfer from '../models/PendingInventoryTransfer';
import Sku from '../models/Sku';
import Vendor from '../models/Vendor';
import InventoryHistory from '../models/InventoryHistory';
import { Types } from "mongoose";
import mongoose from 'mongoose';
import { emitLowStockNotification } from '../services/socketService';

const ObjectId = Types.ObjectId;

// ADD INVENTORY - will be added by admin only
export const addInventory = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { skuId, quantity } = req.body;
  const adminUser = req.user;

  if (adminUser.role !== 'admin') {
    res.status(403).json({ message: 'Access denied. Only admins can add inventory.' });
    return;
  }

  const sku = await Sku.findById(skuId);
  if (!sku) {
    res.status(404).json({ message: 'SKU not found' });
    return;
  }

  let inventory = await Inventory.findOne({ sku: skuId, admin: adminUser._id, vendor: null });

  if (inventory) {
    inventory.quantity += quantity;
    await inventory.save();
  } else {
    inventory = await Inventory.create({
      sku: skuId,
      admin: adminUser._id,
      quantity
    });
  }

  res.status(201).json(inventory);
});

// TRANSFER INVENTORY FROM ADMIN TO VENDOR
export const transferInventoryToVendor = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { transfers, vendorId } = req.body; // transfers is an array of {skuId, quantity}
  const adminUser = req.user;

  if (adminUser.role !== 'admin') {
    res.status(403).json({ message: 'Access denied. Only admins can transfer inventory.' });
    return;
  }

  if (!Array.isArray(transfers) || transfers.length === 0) {
    res.status(400).json({ message: 'Transfers array is required and cannot be empty' });
    return;
  }

  const vendor = await Vendor.findOne({ _id: new ObjectId(vendorId), active: true });
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const results = [];
    const historyRecords = [];
    const pendingTransfers = [];

    for (const transfer of transfers) {
      const { skuId, quantity } = transfer;

      const adminInventory = await Inventory.findOne({
        sku: skuId,
        admin: adminUser._id,
        vendor: null
      }).session(session);

      if (!adminInventory) {
        results.push({ skuId, status: 'error', message: 'Admin inventory not found for this SKU' });
        continue;
      }

      if (adminInventory.quantity < quantity) {
        results.push({
          skuId,
          status: 'error',
          message: `Insufficient quantity. Available: ${adminInventory.quantity}, Requested: ${quantity}`
        });
        continue;
      }

      adminInventory.quantity -= quantity;
      await adminInventory.save({ session });

      const pendingTransfer = await PendingInventoryTransfer.create([{
        sku: skuId,
        vendor: vendorId,
        admin: adminUser._id,
        quantity,
        status: 'pending'
      }], { session });

      pendingTransfers.push(pendingTransfer[0]);

      historyRecords.push({
        inventory: adminInventory._id,
        sku: skuId,
        fromAdmin: adminUser._id,
        toVendor: vendorId,
        quantity,
        type: 'transfer_initiated',
        reason: `Transfer ${quantity} units to vendor ${vendor.name}`,
        pendingTransferId: pendingTransfer[0]._id
      });

      results.push({
        skuId,
        quantity,
        status: 'success',
        message: 'Transfer initiated successfully',
        pendingTransferId: pendingTransfer[0]._id
      });
    }

    if (historyRecords.length > 0) {
      await InventoryHistory.insertMany(historyRecords, { session });
    }

    await session.commitTransaction();

    res.status(200).json({
      message: 'Inventory transfer initiated successfully',
      results
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// GET PENDING TRANSFERS FOR VENDOR
export const getPendingTransfers = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const user = req.user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  if (user.role !== 'vendor') {
    res.status(403).json({ message: 'Access denied. Only vendors can view pending transfers.' });
    return;
  }

  const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
  if (!vendorDoc) {
    res.status(404).json({ message: 'Vendor record not found' });
    return;
  }

  const [transfers, totalCount] = await Promise.all([
    PendingInventoryTransfer.find({ vendor: vendorDoc._id })
      .populate('sku', 'skuId title brand images mrp')
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PendingInventoryTransfer.countDocuments({ vendor: vendorDoc._id })
  ]);

  res.json({
    data: transfers,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});

// VENDOR ACCEPT OR REJECT PENDING TRANSFER
export const respondToPendingTransfer = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { transferId } = req.params;
  const { action, rejectionReason } = req.body; // action: 'accept' or 'reject'
  const user = req.user;

  if (user.role !== 'vendor') {
    res.status(403).json({ message: 'Access denied. Only vendors can respond to transfers.' });
    return;
  }

  const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
  if (!vendorDoc) {
    res.status(404).json({ message: 'Vendor record not found' });
    return;
  }

  const pendingTransfer = await PendingInventoryTransfer.findById(transferId);
  if (!pendingTransfer) {
    res.status(404).json({ message: 'Pending transfer not found' });
    return;
  }

  if (pendingTransfer.vendor.toString() !== vendorDoc._id.toString()) {
    res.status(403).json({ message: 'Access denied to this transfer' });
    return;
  }

  if (pendingTransfer.status !== 'pending') {
    res.status(400).json({ message: `Transfer already ${pendingTransfer.status}` });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (action === 'accept') {
      let vendorInventory = await Inventory.findOne({
        sku: pendingTransfer.sku,
        vendor: vendorDoc._id
      }).session(session);

      if (vendorInventory) {
        vendorInventory.quantity += pendingTransfer.quantity;
        await vendorInventory.save({ session });
      } else {
        const newInventory = await Inventory.create([{
          sku: pendingTransfer.sku,
          vendor: vendorDoc._id,
          quantity: pendingTransfer.quantity
        }], { session });
        vendorInventory = newInventory[0];
      }

      pendingTransfer.status = 'accepted';
      pendingTransfer.respondedAt = new Date();
      await pendingTransfer.save({ session });

      await InventoryHistory.create([{
        inventory: vendorInventory._id,
        sku: pendingTransfer.sku,
        fromAdmin: pendingTransfer.admin,
        toVendor: vendorDoc._id,
        quantity: pendingTransfer.quantity,
        type: 'transfer_accepted',
        reason: `Vendor accepted transfer of ${pendingTransfer.quantity} units`,
        pendingTransferId: pendingTransfer._id
      }], { session });

      await session.commitTransaction();

      // Check for low stock after transaction commits
      if (vendorInventory.quantity < 30) {
        const sku = await Sku.findById(pendingTransfer.sku);
        const vendor = await Vendor.findById(vendorDoc._id);
        if (sku && vendor) {
          emitLowStockNotification(vendor.name, sku.title, vendorInventory.quantity);
        }
      }

      res.json({
        message: 'Transfer accepted successfully',
        pendingTransfer,
        vendorInventory
      });
    } else if (action === 'reject') {
      const adminInventory = await Inventory.findOne({
        sku: pendingTransfer.sku,
        admin: pendingTransfer.admin,
        vendor: null
      }).session(session);

      if (adminInventory) {
        adminInventory.quantity += pendingTransfer.quantity;
        await adminInventory.save({ session });
      }

      pendingTransfer.status = 'rejected';
      pendingTransfer.rejectionReason = rejectionReason || 'No reason provided';
      pendingTransfer.respondedAt = new Date();
      await pendingTransfer.save({ session });

      await InventoryHistory.create([{
        inventory: adminInventory?._id,
        sku: pendingTransfer.sku,
        fromAdmin: pendingTransfer.admin,
        toVendor: vendorDoc._id,
        quantity: pendingTransfer.quantity,
        type: 'transfer_rejected',
        reason: `Vendor rejected transfer: ${pendingTransfer.rejectionReason}`,
        pendingTransferId: pendingTransfer._id
      }], { session });

      await session.commitTransaction();

      res.json({
        message: 'Transfer rejected successfully. Quantity returned to admin inventory.',
        pendingTransfer
      });
    } else {
      await session.abortTransaction();
      res.status(400).json({ message: 'Invalid action. Use "accept" or "reject"' });
      return;
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// GET ALL INVENTORY - vendor wise and admin ko saari inventory
export const getInventory = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const user = req.user;

  if (user.role === 'admin') {
    const [list, totalCount] = await Promise.all([
      Inventory.find({ admin: user._id, vendor: null })
        .populate('sku', 'skuId title brand images mrp')
        .skip(skip)
        .limit(limit),
      Inventory.countDocuments({ admin: user._id, vendor: null })
    ]);

    res.json({
      data: list,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } else if (user.role === 'vendor') {
    const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
    if (!vendorDoc) {
      res.status(404).json({ message: 'Vendor record not found' });
      return;
    }

    const [list, totalCount] = await Promise.all([
      Inventory.find({ vendor: vendorDoc._id })
        .populate('sku', 'skuId title brand images mrp')
        .skip(skip)
        .limit(limit),
      Inventory.countDocuments({ vendor: vendorDoc._id })
    ]);

    res.json({
      data: list,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } else {
    res.status(403).json({ message: 'Access denied' });
    return;
  }
});

// GET SINGLE INVENTORY WITH FULL POPULATION
export const getInventoryById = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const inv = await Inventory.findById(req.params.id)
    .populate('sku')
    .populate('vendor')
    .populate('admin');

  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  res.json(inv);
});

// UPDATE INVENTORY QUANTITY & PRICE
export const updateInventoryQty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const inv = await Inventory.findById(req.params.id).populate('sku').populate('vendor');
  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  const oldQuantity = inv.quantity;
  inv.quantity = req.body.quantity ?? inv.quantity;
  inv.price = req.body.price ?? inv.price;
  await inv.save();

  // Check for low stock if this is vendor inventory and quantity changed
  if (inv.vendor && inv.quantity < 30 && inv.quantity !== oldQuantity) {
    const sku = await Sku.findById(inv.sku);
    const vendor = await Vendor.findById(inv.vendor);
    if (sku && vendor) {
      emitLowStockNotification(vendor.name, sku.title, inv.quantity);
    }
  }

  res.json(inv);
});
