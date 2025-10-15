import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import PickupPoint from '../models/PickupPoint';

// ADD PICKUP POINT
export const addPickup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, address, state, city, area } = req.body;

  const p = await PickupPoint.create({ name, address, state, city, area });
  res.status(201).json(p);
});

// GET ALL PICKUP POINTS
export const getPickups = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const list = await PickupPoint.find().populate('vendors');
  res.json(list);
});

// ASSIGN VENDOR TO PICKUP POINT
export const assignVendorToPickup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pickup = await PickupPoint.findById(req.params.id);

  if (!pickup) {
    res.status(404).json({ message: 'Pickup not found' });
    return; // Stop execution if pickup is null
  }

  // TypeScript knows pickup is not null here
  pickup.vendors.push(req.body.vendorId);
  await pickup.save();

  res.json(pickup);
});
