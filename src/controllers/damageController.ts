import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import DamageTicket from '../models/DamageTicket';
import Inventory from '../models/Inventory';

// CREATE DAMAGE TICKET
export const createDamageTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { inventoryId, vendorId, skuId, quantity, type, reason } = req.body;

  const ticket = await DamageTicket.create({
    inventory: inventoryId,
    vendor: vendorId,
    sku: skuId,
    quantity,
    type,
    reason,
  });

  res.status(201).json(ticket);
});

// APPROVE DAMAGE TICKET AND DEDUCT INVENTORY
export const approveDamageTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const ticket = await DamageTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ message: 'Ticket not found' });
    return; // Stop execution if ticket not found
  }

  ticket.status = 'approved';
  await ticket.save();

  // Deduct quantity from inventory safely
  const inv = await Inventory.findById(ticket.inventory);
  if (inv) {
    inv.quantity = Math.max(0, inv.quantity - ticket.quantity);
    await inv.save();
  }

  res.json(ticket);
});

// GET ALL DAMAGE TICKETS
export const getDamageTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const list = await DamageTicket.find()
    .populate('vendor')
    .populate('sku')
    .populate('inventory');

  res.json(list);
});
