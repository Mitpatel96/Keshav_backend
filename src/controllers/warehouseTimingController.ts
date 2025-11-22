import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import VendorWarehouseTiming from '../models/VendorWarehouseTiming';
import Vendor from '../models/Vendor';
import Order from '../models/Order';
import { Types } from 'mongoose';
import { getMondayOfWeek, getSundayOfWeek } from '../utils/dateUtils';
import { sendMail } from '../services/mailService';
import { weeklyWarehouseTimingEmailTemplate } from '../helper/template';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId | string;
    role?: string;
    permanentId?: string;
  };
}

/**
 * Add or Update warehouse timings for a vendor
 * When timings are updated, users with pending orders from that vendor will be notified via email
 */
export const addOrUpdateVendorWarehouseTiming = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { vendorId, weekStartDate, timings: timingsInput, selectedDays, defaultTiming } = req.body;

  // Support two modes:
  // 1. Traditional: Provide timings array with day-specific timings
  // 2. Quick mode: Provide selectedDays and defaultTiming to apply same timing to multiple days

  if (!vendorId) {
    res.status(400).json({ message: 'vendorId is required' });
    return;
  }

  let timings = timingsInput;

  // If using quick mode (selectedDays + defaultTiming)
  if (selectedDays && defaultTiming && (!timings || timings.length === 0)) {
    if (!Array.isArray(selectedDays) || selectedDays.length === 0) {
      res.status(400).json({ message: 'selectedDays must be a non-empty array' });
      return;
    }

    // Validate defaultTiming
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(defaultTiming.startTime) || !timeRegex.test(defaultTiming.endTime)) {
      res.status(400).json({ message: 'Invalid time format in defaultTiming. Use HH:mm format (e.g., 09:00)' });
      return;
    }

    // Convert selectedDays to timings array
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    timings = selectedDays.map((day: string) => ({
      day: day.toLowerCase(),
      startTime: defaultTiming.startTime,
      endTime: defaultTiming.endTime,
      isOpen: defaultTiming.isOpen !== undefined ? defaultTiming.isOpen : true
    }));

    // Validate all selected days are valid
    for (const timing of timings) {
      if (!validDays.includes(timing.day)) {
        res.status(400).json({ message: `Invalid day: ${timing.day}. Must be one of: ${validDays.join(', ')}` });
        return;
      }
    }
  }

  if (!timings || !Array.isArray(timings) || timings.length === 0) {
    res.status(400).json({ message: 'Either timings array or (selectedDays + defaultTiming) is required' });
    return;
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  // Check if vendor is updating timings for themselves or if admin is doing it
  const isVendor = req.user?.role === 'vendor';
  const isAdmin = req.user?.role === 'admin';

  // Vendors and Users share the same permanentId, so we check by permanentId instead of _id
  if (isVendor && req.user?.permanentId !== vendor.permanentId) {
    res.status(403).json({ message: 'You can only set timings for your own vendor account' });
    return;
  }

  // Determine week start date
  // If weekStartDate is provided, it can be any date within that week
  // The system will automatically calculate the Monday of that week
  // Examples:
  // - If you pass tomorrow's date, it will set timings for the week containing tomorrow
  // - If you pass a date in next week, it will set timings for next week
  // - If not provided, defaults to current week
  let weekStart: Date;
  if (weekStartDate) {
    const providedDate = new Date(weekStartDate);
    // Validate that the date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    providedDate.setHours(0, 0, 0, 0);

    // Allow setting timings for today or future dates only
    if (providedDate < today) {
      res.status(400).json({
        message: 'Cannot set timings for past dates. Please provide today\'s date or a future date.'
      });
      return;
    }

    weekStart = getMondayOfWeek(providedDate);
  } else {
    // Default to current week
    weekStart = getMondayOfWeek(new Date());
  }

  // Normalize weekStart to start of day UTC to ensure consistent storage
  weekStart = getMondayOfWeek(weekStart);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = getSundayOfWeek(weekStart);

  // Validate timings format
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  for (const timing of timings) {
    if (!validDays.includes(timing.day)) {
      res.status(400).json({ message: `Invalid day: ${timing.day}. Must be one of: ${validDays.join(', ')}` });
      return;
    }
    if (!timeRegex.test(timing.startTime) || !timeRegex.test(timing.endTime)) {
      res.status(400).json({ message: `Invalid time format for ${timing.day}. Use HH:mm format (e.g., 09:00)` });
      return;
    }
  }

  // Check if this is an update (timing already exists)
  const existingTiming = await VendorWarehouseTiming.findOne({
    vendor: vendorId,
    weekStartDate: weekStart
  });

  const isUpdate = !!existingTiming;

  // If updating and timings exist, merge with existing timings (partial update support)
  let finalTimings = timings;
  if (isUpdate && existingTiming && existingTiming.timings && existingTiming.timings.length > 0) {
    // Create a map of existing timings by day
    const existingTimingsMap = new Map(
      existingTiming.timings.map((t: any) => [t.day, t])
    );

    // Create a map of new timings by day
    const newTimingsMap = new Map(
      timings.map((t: any) => [t.day, t])
    );

    // Merge: new timings override existing ones, keep existing ones that aren't in new timings
    const mergedTimings: any[] = [];
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of allDays) {
      if (newTimingsMap.has(day)) {
        // Use new timing if provided
        mergedTimings.push(newTimingsMap.get(day));
      } else if (existingTimingsMap.has(day)) {
        // Keep existing timing if not provided in update
        mergedTimings.push(existingTimingsMap.get(day));
      } else {
        // If neither exists, this shouldn't happen, but handle it
        mergedTimings.push({
          day: day,
          startTime: '09:00',
          endTime: '18:00',
          isOpen: false
        });
      }
    }

    finalTimings = mergedTimings;
  }

  // Create or update warehouse timing
  const warehouseTiming = await VendorWarehouseTiming.findOneAndUpdate(
    { vendor: vendorId, weekStartDate: weekStart },
    {
      vendor: vendorId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      timings: finalTimings,
      isLocked: false
    },
    { upsert: true, new: true }
  ).populate('vendor', 'name phone email');

  // If this is an update, send emails to users with pending orders from this vendor
  let emailsSent = 0;
  if (isUpdate) {
    try {
      // Find all users with pending_verification orders from this vendor
      const pendingOrders = await Order.find({
        vendor: vendorId,
        status: 'pending_verification',
        orderType: 'online'
      })
        .populate('user', 'email name')
        .populate('items.sku', 'title')
        .lean();

      // Group orders by user email
      const userOrdersMap = new Map<string, any[]>();
      for (const order of pendingOrders) {
        if (order.user && typeof order.user === 'object' && 'email' in order.user) {
          const userEmail = (order.user as any).email;
          if (userEmail) {
            if (!userOrdersMap.has(userEmail)) {
              userOrdersMap.set(userEmail, []);
            }
            userOrdersMap.get(userEmail)!.push(order);
          }
        }
      }

      // Send email to each user
      for (const [userEmail, orders] of userOrdersMap.entries()) {
        try {
          const user = orders[0].user;
          if (!user || typeof user !== 'object' || !('name' in user) || !('email' in user)) continue;

          // Create email with updated warehouse timings
          const emailHtml = weeklyWarehouseTimingEmailTemplate({
            vendorName: vendor.name || 'Vendor',
            vendorPhone: vendor.phone || '',
            warehouseTimings: warehouseTiming.timings || []
          });

          await sendMail({
            to: (user as any).email,
            subject: `Updated Warehouse Timings - ${vendor.name}`,
            html: emailHtml
          });

          emailsSent++;
        } catch (error) {
          console.error(`Error sending email to ${userEmail}:`, error);
        }
      }

      console.log(`Warehouse timing updated. Emails sent to ${emailsSent} users with pending orders.`);
    } catch (error) {
      console.error('Error sending notification emails:', error);
      // Don't fail the request if email sending fails
    }
  }

  res.status(isUpdate ? 200 : 201).json({
    message: isUpdate
      ? 'Warehouse timings updated successfully. Users with pending orders have been notified.'
      : 'Warehouse timings added successfully',
    warehouseTiming,
    emailsSent: isUpdate ? emailsSent : undefined
  });
});

/**
 * Get warehouse timings for a vendor
 */
export const getWarehouseTimings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;
  const { weekStartDate } = req.query;

  if (!vendorId) {
    res.status(400).json({ message: 'vendorId is required' });
    return;
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  let mondayOfQueryWeek: Date;
  if (weekStartDate) {
    const startDate = new Date(weekStartDate as string);
    mondayOfQueryWeek = getMondayOfWeek(startDate);
  } else {
    // Get current week's timings by default
    const today = new Date();
    mondayOfQueryWeek = getMondayOfWeek(today);
  }

  // Normalize to start of day UTC for comparison
  const startOfDay = new Date(mondayOfQueryWeek);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Use a wider range to handle timezone differences (up to 24 hours before and after)
  // This accounts for dates stored in different timezones (e.g., Nov 16 18:30 UTC = Nov 17 00:00 IST)
  const queryStart = new Date(startOfDay);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1); // Allow 1 day before (for timezone offset)
  queryStart.setUTCHours(0, 0, 0, 0);

  const queryEnd = new Date(startOfDay);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1); // Allow 1 day after
  queryEnd.setUTCHours(0, 0, 0, 0);

  // Query with range to handle timezone differences
  const warehouseTiming = await VendorWarehouseTiming.findOne({
    vendor: vendorId,
    weekStartDate: {
      $gte: queryStart,
      $lt: queryEnd
    }
  }).populate('vendor', 'name phone email');

  if (!warehouseTiming) {
    res.status(404).json({ message: 'Warehouse timings not found for this week' });
    return;
  }

  res.json(warehouseTiming);
});



