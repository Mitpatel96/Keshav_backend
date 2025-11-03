import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Inventory from '../models/Inventory';
import Sku from '../models/Sku';
import Vendor from '../models/Vendor';
import User from '../models/User';
import InventoryHistory from '../models/InventoryHistory';
import {Types} from "mongoose"

const ObjectId = Types.ObjectId;

// ADD INVENTORY - will added by admin only
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

  const inv = await Inventory.create({
    sku: skuId,
    admin: adminUser._id,
    quantity,
    status: 'confirmed'
  });

  res.status(201).json(inv);
});

// TRANSFER MULTIPLE INVENTORY ITEMS FROM ADMIN TO VENDOR - Updated function
export const transferInventoryToVendor = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { transfers, vendorId } = req.body; // transfers is an array of {inventoryId, quantity}
  const adminUser = req.user;

  // Check if user is admin
  if (adminUser.role !== 'admin') {
    res.status(403).json({ message: 'Access denied. Only admins can transfer inventory.' });
    return;
  }

  // Validate transfers array
  if (!Array.isArray(transfers) || transfers.length === 0) {
    res.status(400).json({ message: 'Transfers array is required and cannot be empty' });
    return;
  }

  // Find the vendor
  const vendor = await Vendor.findOne({ _id: new ObjectId(vendorId), active: true });
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  // Process each transfer
  const results = [];
  const historyRecords = [];

  for (const transfer of transfers) {
    const { inventoryId, quantity } = transfer;

    // Find the main inventory item (admin inventory)
    const mainInventory = await Inventory.findById(inventoryId);
    if (!mainInventory) {
      results.push({ inventoryId, status: 'error', message: 'Inventory not found' });
      continue;
    }

    // Check if this is an admin inventory item
    if (!mainInventory.admin) {
      results.push({ inventoryId, status: 'error', message: 'This is not an admin inventory item' });
      continue;
    }

    // Check if sufficient quantity is available
    if (mainInventory.quantity < quantity) {
      results.push({ inventoryId, status: 'error', message: 'Insufficient quantity in main inventory' });
      continue;
    }

    // Deduct quantity from main inventory
    mainInventory.quantity -= quantity;
    await mainInventory.save();

    // Create or update vendor inventory
    let vendorInventory = await Inventory.findOne({ sku: mainInventory.sku, vendor: vendorId });
    if (vendorInventory) {
      vendorInventory.quantity += quantity;
      await vendorInventory.save();
    } else {
      vendorInventory = await Inventory.create({
        sku: mainInventory.sku,
        vendor: vendorId,
        quantity,
        status: 'pending' // Vendor needs to approve
      });
    }

    // Add to results
    results.push({
      inventoryId,
      skuId: mainInventory.sku,
      quantity,
      mainInventory,
      vendorInventory,
      status: 'success'
    });

    // Prepare history record
    historyRecords.push({
      inventory: mainInventory._id,
      sku: mainInventory.sku,
      fromAdmin: adminUser._id,
      toVendor: vendorId,
      quantity,
      type: 'transfer_to_vendor',
      reason: `Transfer ${quantity} units to vendor ${vendor.name}`
    });
  }

  // Create all inventory history records
  if (historyRecords.length > 0) {
    await InventoryHistory.insertMany(historyRecords);
  }

  res.status(200).json({
    message: 'Inventory transfer completed',
    results
  });
});

// GET ALL INVENTORY - vendor wise and admin ko saari inventory
export const getInventory = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const user = req.user;

  let pipeline;
  if (user.role === 'admin') {
    pipeline = [
      { $match: { admin: user._id, vendorId: null } },
      {
        $lookup: {
          from: 'skus', localField: 'sku', foreignField: '_id', as: 'sku',
          pipeline: [{ $project: { skuId: 1, title: 1, brand: 1, images: 1, mrp: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendor',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users', localField: 'admin', foreignField: '_id', as: 'admin',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      {
        $addFields: {
          sku: { $arrayElemAt: ['$sku', 0] },
          vendor: {
            $cond: [
              { $eq: [{ $size: '$vendor' }, 0] },
              null,
              { $arrayElemAt: ['$vendor', 0] }
            ]
          },
          admin: {
            $cond: [
              { $eq: [{ $size: '$admin' }, 0] },
              null,
              { $arrayElemAt: ['$admin', 0] }
            ]
          }
        }
      }
    ];

    try {
      const paginatedPipeline = [...pipeline];
      paginatedPipeline.push({ $skip: skip });
      paginatedPipeline.push({ $limit: limit });

      const [list, totalCount] = await Promise.all([
        Inventory.aggregate(paginatedPipeline),
        Inventory.countDocuments({ admin: user._id }) // Count only admin's inventory
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
    } catch (err) {
      console.error('Aggregation error:', err);
      const [list, totalCount] = await Promise.all([
        Inventory.find({ admin: user._id }).populate('sku').populate('vendor').populate('admin')
          .skip(skip)
          .limit(limit),
        Inventory.countDocuments({ admin: user._id }) // Count only admin's inventory
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
    }
  } else if (user.role === 'vendor') {
    const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
    if (!vendorDoc) {
      res.status(404).json({ message: 'Vendor record not found' });
      return;
    }

    pipeline = [
      { $match: { vendor: vendorDoc._id } },
      {
        $lookup: {
          from: 'skus', localField: 'sku', foreignField: '_id', as: 'sku',
          pipeline: [{ $project: { skuId: 1, title: 1, brand: 1, images: 1, mrp: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendor',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      {
        $addFields: {
          sku: { $arrayElemAt: ['$sku', 0] },
          vendor: {
            $cond: [
              { $eq: [{ $size: '$vendor' }, 0] },
              null,
              { $arrayElemAt: ['$vendor', 0] }
            ]
          }
        }
      }
    ];

    try {
      const paginatedPipeline = [...pipeline];
      paginatedPipeline.push({ $skip: skip });
      paginatedPipeline.push({ $limit: limit });

      const [list, totalCount] = await Promise.all([
        Inventory.aggregate(paginatedPipeline),
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
    } catch (err) {
      console.error('Aggregation error:', err);
      const [list, totalCount] = await Promise.all([
        Inventory.find({ vendor: vendorDoc._id }).populate('sku').populate('vendor')
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
    }
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
  const inv = await Inventory.findById(req.params.id);
  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  inv.quantity = req.body.quantity ?? inv.quantity;
  inv.price = req.body.price ?? inv.price;
  await inv.save();

  res.json(inv);
});

// VENDOR APPROVE INVENTORY - vendor can approve their pending inventory
export const approveOrRejectInventory = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const inv = await Inventory.findById(req.params.id);
  if (!inv) {
    res.status(404).json({ message: 'Inventory not found' });
    return;
  }

  const user = req.user;

  if (user.role !== 'vendor') {
    res.status(403).json({ message: 'Access denied. Only vendors can approve inventory.' });
    return;
  }

  // Find the vendor document associated with this user
  const vendorDoc = await Vendor.findOne({ permanentId: user.permanentId });
  if (!vendorDoc) {
    res.status(404).json({ message: 'Vendor record not found' });
    return;
  }

  if (inv.vendor?.toString() !== vendorDoc._id.toString()) {
    res.status(403).json({ message: 'Access denied to this inventory item' });
    return;
  }

  if (inv.status !== 'pending') {
    res.status(400).json({ message: 'Only pending inventory can be approved' });
    return;
  }

  inv.status = req?.body?.status || 'confirmed';
  await inv.save();

  res.json({
    message: `Inventory ${req?.body?.status} successfully`,
    inventory: inv
  });
});