import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Vendor from '../models/Vendor';
import User from '../models/User';
import { generatePermanentId } from '../utils/idGenerator';

export const addVendor = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, email, address, documents, state, city, area } = req.body;
  const count = await Vendor.countDocuments();
  const permanentId = generatePermanentId('V', count + 1);
  const vendor = await Vendor.create({ permanentId, name, phone, email, address, documents, state, city, area });
  // Create vendor user record too
  await User.create({ permanentId, name, email, role: 'vendor', active: true });
  res.status(201).json(vendor);
});

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await Vendor.find();
  res.json(vendors);
});

export const getVendorById = asyncHandler(async (req: Request, res: Response):Promise<void>  => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor)  res.status(404).json({ message: 'Vendor not found' });
  res.json(vendor);
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(vendor);
});

export const deactivateVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  res.json(vendor);
});
