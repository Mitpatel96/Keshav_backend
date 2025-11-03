import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Sku from '../models/Sku';
import { generateSkuId } from '../utils/idGenerator';
import { kMaxLength } from 'buffer';
import { kill } from 'process';
import { ObjectLockLegalHoldStatus } from '@aws-sdk/client-s3';

export const addSku = asyncHandler(async (req: Request, res: Response) => {
  const { title, brand, category, images, mrp } = req.body;
  const skuId = generateSkuId(title);
  const sku = await Sku.create({ skuId, title, brand, category, images, mrp });
  res.status(201).json(sku);
});

export const getSkus = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const skus = await Sku.find()
      .populate('category', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Sku.countDocuments();

    res.json({
      data: skus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ message: 'Internal server error while fetching SKUs' });
  }
});

export const updateSku = asyncHandler(async (req: Request, res: Response) => {
  const sku = await Sku.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(sku);
});