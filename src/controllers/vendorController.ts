import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Vendor from '../models/Vendor';
import User from '../models/User';
import { generatePermanentId } from '../utils/idGenerator';
import { sendWelcomeEmail } from '../services/mailService';

export const addVendor = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, email, address, documents, state, city, area, dob, location } = req.body;

  // Validate required fields
  if (!name || !phone || !email || !dob || !location) {
    res.status(400).json({ message: 'Name, phone number, email, date of birth, and location are required' });
    return;
  }

  // Validate date of birth format
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) {
    res.status(400).json({ message: 'Invalid date of birth format' });
    return;
  }

  // Validate location format
  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    res.status(400).json({ message: 'Invalid location format. Expected { type: "Point", coordinates: [longitude, latitude] }' });
    return;
  }

  const existingConditions: any[] = [];
  if (email) {
    existingConditions.push({ email });
  }
  if (phone) {
    existingConditions.push({ phone });
  }

  if (existingConditions.length > 0) {
    const existingVendor = await Vendor.findOne({
      $or: existingConditions
    });

    if (existingVendor) {
      if (existingVendor.email === email) {
        res.status(400).json({ message: 'Email already used by another vendor' });
        return;
      }
      if (existingVendor.phone === phone) {
        res.status(400).json({ message: 'Phone number already used by another vendor' });
        return;
      }
    }
  }

  try {
    // Use a more robust approach to generate unique vendor IDs
    let vendorIdGenerated = false;
    let permanentId = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!vendorIdGenerated && attempts < maxAttempts) {
      attempts++;

      // Get the last vendor to determine the next ID
      const lastVendor = await Vendor.findOne({}, { permanentId: 1 }).sort({ permanentId: -1 });
      let nextNumber = 1001;

      if (lastVendor && lastVendor.permanentId) {
        const lastNumber = parseInt(lastVendor.permanentId.replace('V', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      permanentId = generatePermanentId('V', nextNumber);

      // Try to create the vendor with this ID
      const existingWithSameId = await Vendor.findOne({ permanentId });
      if (!existingWithSameId) {
        vendorIdGenerated = true;
      } else {
        // Wait a bit before trying again to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (!vendorIdGenerated) {
      res.status(500).json({ message: 'Internal server error: unable to generate unique vendor ID after multiple attempts' });
      return;
    }

    const generatedPassword = Math.random().toString(36).slice(-8);

    const vendorData = {
      vendorId: permanentId,
      permanentId,
      name,
      phone,
      email,
      address,
      documents,
      state,
      city,
      area,
      dob: dobDate,
      location
    };

    const vendor = await Vendor.create(vendorData);

    // Create vendor user record too
    const vendorUser = await User.create({
      permanentId,
      name,
      email,
      phone,
      address,
      password: generatedPassword,
      dob: dobDate,
      role: 'vendor',
      active: true,
      location
    });

    try {
      await sendWelcomeEmail(email, name, email, generatedPassword);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({ vendor, vendorUser });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      res.status(400).json({
        message: `Duplicate entry for field: ${duplicateField}. Please use a different value.`
      });
    } else {
      res.status(500).json({ message: 'Internal server error while creating vendor' });
    }
  }
});

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const vendors = await Vendor.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Vendor.countDocuments();

    res.json({
      data: vendors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Internal server error while fetching vendors' });
  }
});

export const getVendorById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) res.status(404).json({ message: 'Vendor not found' });
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
