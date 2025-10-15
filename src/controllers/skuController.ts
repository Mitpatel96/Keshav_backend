import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Sku from '../models/Sku';
import { generateSkuId } from '../utils/idGenerator';

export const addSku = asyncHandler(async (req: Request, res: Response) => {
  const { title, category, brand, variants, images, basePrice, mrp, taxPercent } = req.body;
  const skuId = generateSkuId(title);
  const sku = await Sku.create({ skuId, title, category, brand, variants, images, basePrice, mrp, taxPercent });
  res.status(201).json(sku);
});

export const getSkus = asyncHandler(async (req: Request, res: Response) => {
  const skus = await Sku.find();
  res.json(skus);
});

export const updateSku = asyncHandler(async (req: Request, res: Response) => {
  const sku = await Sku.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(sku);
});
