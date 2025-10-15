import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Promo from '../models/Promo';

export const createPromo = asyncHandler(async (req: Request, res: Response) => {
  const { code, products, discountPercent, discountAmount, usageType, usageLimit, expiresAt } = req.body;
  const promo = await Promo.create({ code, products, discountPercent, discountAmount, usageType, usageLimit, expiresAt });
  res.status(201).json(promo);
});

export const getPromos = asyncHandler(async (req: Request, res: Response) => {
  const promos = await Promo.find().populate('products');
  res.json(promos);
});

export const updatePromo = asyncHandler(async (req: Request, res: Response) => {
  const promo = await Promo.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(promo);
});