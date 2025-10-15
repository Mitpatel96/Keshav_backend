import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Inventory from '../models/Inventory';
import Sku from '../models/Sku';

// ADD INVENTORY
export const addInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { skuId, vendorId, quantity, price } = req.body;

  const sku = await Sku.findById(skuId);
  if (!sku) {
    res.status(404).json({ message: 'SKU not found' });
    return; // stop execution if SKU not found
  }

  const inv = await Inventory.create({ sku: sku._id, vendor: vendorId, quantity, price, status: 'pending' });
  res.status(201).json(inv);
});

// CONFIRM INVENTORY (MARK AS AVAILABLE)
export const confirmInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const inv = await Inventory.findByIdAndUpdate(req.params.id, { status: 'available' }, { new: true });
  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }
  res.json(inv);
});

// GET ALL INVENTORY
export const getInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const list = await Inventory.find().populate('sku').populate('vendor');
  res.json(list);
});

// UPDATE INVENTORY QUANTITY & PRICE
export const updateInventoryQty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const inv = await Inventory.findById(req.params.id);
  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return; // stop execution if inventory not found
  }

  inv.quantity = req.body.quantity ?? inv.quantity;
  inv.price = req.body.price ?? inv.price;
  await inv.save();

  res.json(inv);
});
