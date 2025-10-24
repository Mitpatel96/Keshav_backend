import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import DamageTicket from '../models/DamageTicket';
import Inventory from '../models/Inventory';
import InventoryHistory from '../models/InventoryHistory';
import Vendor from '../models/Vendor';

// CREATE DAMAGE TICKET
export const createDamageTicket = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { inventoryId, vendorId, skuId, quantity, type, reason } = req.body;
  const user = req.user;

  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  if (inventory.quantity < quantity) {
    res.status(400).json({ message: 'Insufficient quantity in inventory' });
    return;
  }

  let ticket: any;

  if (user.role === 'admin') {
    inventory.quantity -= quantity;
    await inventory.save();

    ticket = await DamageTicket.create({
      inventory: inventoryId,
      vendor: vendorId,
      sku: skuId,
      quantity,
      type,
      reason,
      status: 'approved'
    });

    const historyType = type === 'damage' ? 'deduct_damage' : 'deduct_lost';
    await InventoryHistory.create({
      inventory: inventoryId,
      sku: skuId,
      fromAdmin: user._id,
      quantity,
      type: historyType,
      reason: reason || `Admin reported ${type}: ${quantity} units`,
      referenceId: ticket._id
    });
  } else if (user.role === 'vendor') {
    const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
    if (!vendorDoc || inventory.vendor?.toString() !== vendorDoc._id.toString()) {
      res.status(403).json({ message: 'Access denied to this inventory item' });
      return;
    }

    ticket = await DamageTicket.create({
      inventory: inventoryId,
      vendor: vendorDoc._id,
      sku: skuId,
      quantity,
      type,
      reason,
      status: 'pending'
    });

    const historyType = type === 'damage' ? 'vendor_damage' : 'vendor_lost';
    await InventoryHistory.create({
      inventory: inventoryId,
      sku: skuId,
      fromVendor: vendorDoc._id,
      quantity,
      type: historyType,
      reason: reason || `Vendor reported ${type}: ${quantity} units`,
      referenceId: ticket._id
    });
  } else {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  res.status(201).json(ticket);
});

// APPROVE DAMAGE TICKET AND DEDUCT INVENTORY - This is the api will call by admin only
export const approvePendingDamageTicket = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const ticket: any = await DamageTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ message: 'Ticket not found' });
    return;
  }

  // Only pending tickets can be approved
  if (ticket.status !== 'pending') {
    res.status(400).json({ message: 'Only pending tickets can be approved' });
    return;
  }

  const inventory = await Inventory.findById(ticket.inventory);
  if (!inventory) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  if (inventory.quantity < ticket.quantity) {
    res.status(400).json({ message: 'Insufficient quantity in inventory' });
    return;
  }

  ticket.status = 'approved';
  ticket.approvedByAdmin = req.user._id;
  await ticket.save();

  inventory.quantity = Math.max(0, inventory.quantity - ticket.quantity);
  await inventory.save();

  const historyRecord: any = await InventoryHistory.findOne({ referenceId: ticket._id });
  if (historyRecord) {
    historyRecord.type = historyRecord.type === 'vendor_damage' ? 'deduct_damage' : 'deduct_lost';
    historyRecord.approvedDamageTicketByAdmin = req.user._id;
    await historyRecord.save();
  }

  res.json({
    message: 'Damage ticket approved and inventory deducted',
    ticket,
    inventory
  });
});

// REJECT DAMAGE TICKET - Admin can reject vendor damage tickets
export const rejectDamageTicket = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const ticket: any = await DamageTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ message: 'Ticket not found' });
    return;
  }

  if (ticket.status !== 'pending') {
    res.status(400).json({ message: 'Only pending tickets can be rejected' });
    return;
  }

  // Update ticket status
  ticket.status = 'rejected';
  ticket.approvedByAdmin = req.user._id;
  await ticket.save();

  res.json({
    message: 'Damage ticket rejected',
    ticket
  });
});

// GET ALL DAMAGE TICKETS - vendor ko vendorId wise , admin ko all tickets
export const getDamageTickets = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const user = req.user;
  let query = {};

  if (user.role === 'vendor') {
    const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
    if (vendorDoc) {
      query = { vendor: vendorDoc._id };
    } else {
      res.status(404).json({ message: 'Vendor record not found' });
      return;
    }
  }

  const [list, totalCount] = await Promise.all([
    DamageTicket.find(query)
      .populate('vendor')
      .populate('sku')
      .populate('inventory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DamageTicket.countDocuments(query)
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
});

// GET INVENTORY HISTORY - New function to get inventory history
export const getInventoryHistory = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const user = req.user;
  let query = {};

  if (user.role === 'vendor') {
    const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
    if (vendorDoc) {
      query = { $or: [{ toVendor: vendorDoc._id }, { fromVendor: vendorDoc._id }] };
    } else {
      res.status(404).json({ message: 'Vendor record not found' });
      return;
    }
  }

  const [history, totalCount] = await Promise.all([
    InventoryHistory.find(query)
      .populate('inventory')
      .populate('sku')
      .populate('fromAdmin')
      .populate('toVendor')
      .populate('fromVendor')
      .populate('referenceId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryHistory.countDocuments(query)
  ]);

  res.json({
    data: history,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});