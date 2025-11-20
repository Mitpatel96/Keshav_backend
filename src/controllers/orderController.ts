import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order';
import { Types } from 'mongoose';
import Inventory from '../models/Inventory';
import Sku from '../models/Sku';
import Product from '../models/Product';
import { generateSixDigitAlphaNumericCode } from '../utils/idGenerator';
import InventoryHistory from '../models/InventoryHistory';
import CashAmount from '../models/CashAmount';
import CashDeductionHistory from '../models/CashDeductionHistory';
import Vendor from '../models/Vendor';
import User from '../models/User';
import { sendMail } from '../services/mailService';
import { checkProductAvailability, buildCheckoutSummary, CheckoutItemInput } from '../services/orderService';
import Payment from '../models/Payment';
import { consumePromoCode } from '../services/promoService';
import { emitLowStockNotification, emitNewOrderNotification } from '../services/socketService';
import Cart from '../models/Cart';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId | string;
    role?: string;
  };
}

// CREATE ORDER FOR COMBO OR SOLO PRODUCT (ONLINE)

export const createComboProductOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    userId: rawUserId,
    vendorId: rawVendorId,
    productId,
    quantity,
    paymentMethod,
    items,
    paymentId
  } = req.body;

  let userObjectId: Types.ObjectId | null = rawUserId ? new Types.ObjectId(rawUserId) : null;
  let vendorObjectId: Types.ObjectId | null = rawVendorId ? new Types.ObjectId(rawVendorId) : null;
  let checkoutItems: CheckoutItemInput[] = [];
  let paymentRecord = null;
  let discountAmount = 0;
  let promoCodeApplied: string | undefined;
  let promoCodeId: Types.ObjectId | undefined;

  if (paymentId) {
    paymentRecord = await Payment.findById(paymentId);
    if (!paymentRecord) {
      res.status(404).json({ message: 'Payment record not found' });
      return;
    }

    if (paymentRecord.status !== 'succeeded') {
      res.status(400).json({ message: 'Payment not completed yet' });
      return;
    }

    if (paymentRecord.order) {
      res.status(400).json({ message: 'Order already created for this payment' });
      return;
    }

    userObjectId = paymentRecord.user;
    vendorObjectId = paymentRecord.vendor;
    checkoutItems = paymentRecord.items.map((item) => ({
      productId: item.product.toString(),
      quantity: item.quantity
    }));
    discountAmount = paymentRecord.discountAmount || 0;
    promoCodeApplied = paymentRecord.promoCode;
    promoCodeId = paymentRecord.promoCodeId || undefined;
  }

  if (!userObjectId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  const user = await User.findById(userObjectId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  if (!vendorObjectId) {
    if (!rawVendorId) {
      res.status(400).json({ message: 'vendorId is required' });
      return;
    }
    vendorObjectId = new Types.ObjectId(rawVendorId);
  }

  const vendor = await Vendor.findById(vendorObjectId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  if (checkoutItems.length === 0) {
    if (Array.isArray(items) && items.length > 0) {
      checkoutItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity || 1,
        skuId: item?.skuId // Include skuId for solo products
      }));
    } else if (productId) {
      checkoutItems = [
        {
          productId,
          quantity: quantity || 1,
          skuId: req.body.skuId // Include skuId if provided
        }
      ];
    } else {
      res.status(400).json({ message: 'items or productId must be provided' });
      return;
    }
  }

  const checkoutSummary = await buildCheckoutSummary(checkoutItems, vendorObjectId.toString());
  const calculatedSubtotal = checkoutSummary.subtotal;
  const rawTotal = calculatedSubtotal;
  const finalTotal = Math.max(0, rawTotal - discountAmount);

  if (paymentRecord) {
    if (Math.abs(paymentRecord.subtotal - calculatedSubtotal) > 0.5) {
      res.status(400).json({ message: 'Order amount has changed. Please recreate payment.' });
      return;
    }
    if (Math.abs(paymentRecord.totalAmount - finalTotal) > 0.5) {
      res.status(400).json({ message: 'Order amount mismatch with payment. Please recreate payment.' });
      return;
    }
  }

  const session = await Inventory.startSession();
  session.startTransaction();

  try {
    const orderItems: any[] = [];

    for (const preparedItem of checkoutSummary.items) {
      for (const component of preparedItem.components) {
        const totalRequired = component.quantityPerBundle * preparedItem.quantity;

        const inventories = await Inventory.find({
          sku: component.sku,
          vendor: vendorObjectId
        }).session(session);

        if (!inventories || inventories.length === 0) {
          throw new Error(`SKU ${component.skuTitle} not available at this vendor`);
        }

        let remainingToReserve = totalRequired;
        for (const inventory of inventories) {
          if (remainingToReserve <= 0) break;

          const availableInThisRecord = inventory.quantity - (inventory.reservedQuantity || 0);
          const toReserveFromThis = Math.min(availableInThisRecord, remainingToReserve);

          if (toReserveFromThis > 0) {
            inventory.reservedQuantity = (inventory.reservedQuantity || 0) + toReserveFromThis;
            await inventory.save({ session });
            remainingToReserve -= toReserveFromThis;
          }
        }

        if (remainingToReserve > 0) {
          throw new Error(`Insufficient stock for ${component.skuTitle}`);
        }

        orderItems.push({
          product: preparedItem.product,
          sku: component.sku,
          quantity: component.quantityPerBundle * preparedItem.quantity,
          price: component.unitPrice,
          vendor: vendorObjectId
        });
      }
    }

    const orderVFC = generateSixDigitAlphaNumericCode();
    const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [createdOrder] = await Order.create(
      [
        {
          user: userObjectId,
          product: checkoutSummary.items.length === 1 ? checkoutSummary.items[0].product : undefined,
          vendor: vendorObjectId,
          items: orderItems,
          totalAmount: finalTotal,
          paymentMethod: paymentMethod || 'online',
          status: 'pending_verification',
          orderVFC,
          orderCode,
          orderType: 'online',
          discountAmount,
          promoCode: promoCodeApplied,
          payment: paymentRecord?._id
        }
      ],
      { session }
    );

    await session.commitTransaction();

    if (paymentRecord) {
      paymentRecord.order = createdOrder._id;
      await paymentRecord.save();
      if (promoCodeId) {
        await consumePromoCode(promoCodeId, paymentRecord.user);
      }
    }

    try {
      const cart = await Cart.findOne({ user: userObjectId });
      if (cart) {
        cart.items = [] as any;
        cart.subtotal = 0;
        cart.totalQuantity = 0;
        await cart.save();
        console.log(`Cart cleared for user ${userObjectId} after order creation`);
      }
    } catch (cartError) {
      // Log error but don't fail the order creation if cart clearing fails
      console.error('Error clearing cart after order creation:', cartError);
    }

    // Emit notification to vendor for online order
    console.log(`\n=== Checking Notification Conditions ===`);
    console.log(`Order Type: ${createdOrder.orderType}`);
    console.log(`VendorObjectId exists: ${!!vendorObjectId}`);
    console.log(`VendorObjectId value: ${vendorObjectId}`);
    console.log(`Order ID: ${createdOrder._id}`);
    console.log(`Order Code: ${createdOrder.orderCode}`);
    console.log(`==========================================\n`);

    if (createdOrder.orderType === 'online' && vendorObjectId) {
      console.log(`✅ Conditions met! Preparing notification...`);

      const populatedOrderForNotification = await Order.findById(createdOrder._id)
        .populate('user', 'name email phone')
        .populate('items.sku', 'title')
        .lean();

      if (populatedOrderForNotification) {
        const vendorIdString = vendorObjectId.toString();
        console.log(`\n=== Order Notification Trigger Debug ===`);
        console.log(`Order created for vendor. VendorObjectId: ${vendorObjectId}`);
        console.log(`VendorId string: "${vendorIdString}"`);
        console.log(`Order ID: ${createdOrder._id}`);
        console.log(`Order Code: ${createdOrder.orderCode}`);
        console.log(`Order Type: ${createdOrder.orderType}`);
        console.log(`Order Data to send:`, {
          orderCode: createdOrder.orderCode,
          orderVFC: orderVFC,
          totalAmount: finalTotal,
          itemsCount: populatedOrderForNotification.items?.length || 0,
          user: populatedOrderForNotification.user && typeof populatedOrderForNotification.user === 'object' && 'name' in populatedOrderForNotification.user ? {
            name: (populatedOrderForNotification.user as any).name,
            email: (populatedOrderForNotification.user as any).email
          } : null
        });
        console.log(`==========================================\n`);

        emitNewOrderNotification(
          vendorIdString,
          createdOrder._id.toString(),
          {
            orderCode: createdOrder.orderCode,
            orderVFC: orderVFC,
            totalAmount: finalTotal,
            items: populatedOrderForNotification.items || [],
            user: populatedOrderForNotification.user || null
          }
        );
      } else {
        console.error(`❌ Failed to populate order for notification. Order ID: ${createdOrder._id}`);
      }
    } else {
      console.log(`❌ Notification conditions not met:`);
      if (createdOrder.orderType !== 'online') {
        console.log(`  - Order type is "${createdOrder.orderType}", not "online"`);
      }
      if (!vendorObjectId) {
        console.log(`  - VendorObjectId is missing`);
      }
    }

    try {
      const itemSummary = checkoutSummary.items
        .map((item) => `${item.productTitle} x ${item.quantity}`)
        .join(', ');

      await sendMail({
        to: user.email,
        subject: 'Order Verification Code',
        html: `<p>Your order verification code is: <strong>${orderVFC}</strong></p>
               <p>Order Details:</p>
               <p>Items: ${itemSummary}</p>
               <p>Total Amount: ₹${finalTotal}</p>
               <p>Please present this code when picking up your order.</p>`
      });
    } catch (error) {
      console.error('Failed to send order verification email:', error);
    }

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user')
      .populate('vendor')
      .populate('items.sku');

    res.status(201).json(populatedOrder);
  } catch (error: any) {
    await session.abortTransaction();

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      res.status(400).json({
        message: `Duplicate key error: ${duplicateField} with value '${duplicateValue}' already exists`,
        error: 'DUPLICATE_KEY_ERROR',
        field: duplicateField,
        value: duplicateValue
      });
      return;
    }

    console.error('Error creating order:', error);
    res.status(500).json({
      message: 'Internal server error while creating order',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// 2. Vendor verifies order using orderVFC
export const verifyOrderWithVFC = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderVFC } = req.body;

  const order = await Order.findOne({ orderVFC })
    .populate('user', '-password')
    .populate('vendor')
    .populate('items.sku')
    .lean();

  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.status !== 'pending_verification') {
    res.status(400).json({ message: 'Order is not pending verification' });
    return;
  }

  const enhancedOrder = {
    ...order,
    items: order.items.map((item: any) => ({
      sku: item.sku._id,
      skuName: item.sku.title,
      quantity: item.quantity,
      price: item.price,
      vendor: item.vendor,
      _id: item._id
    }))
  };

  res.json({
    message: 'Order verified successfully',
    order: enhancedOrder
  });
});

// CONFIRM OR REJECT ORDER (VENDOR ACTION)
export const confirmComboProductOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, status } = req.body;

  if (!['confirmed', 'partially_rejected'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be "confirmed" or "partially_rejected"' });
    return;
  }

  const order = await Order.findById(orderId)
    .populate('items.sku')
    .populate('vendor');

  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.status === 'confirmed') {
    res.status(400).json({ message: 'Order already confirmed' });
    return;
  }

  if (order.status !== 'pending_verification') {
    res.status(400).json({ message: 'Order is not pending verification' });
    return;
  }

  // Handle partially rejected - admin will handle this case
  if (status === 'partially_rejected') {
    // Release all reservations across multiple inventory records
    for (const item of order.items) {
      const inventories = await Inventory.find({
        sku: item.sku,
        vendor: item.vendor,
        reservedQuantity: { $gt: 0 }
      });

      let remainingToRelease = item.quantity;
      for (const inventory of inventories) {
        if (remainingToRelease <= 0) break;

        const toReleaseFromThis = Math.min(inventory.reservedQuantity || 0, remainingToRelease);
        if (toReleaseFromThis > 0) {
          inventory.reservedQuantity = Math.max(0, (inventory.reservedQuantity || 0) - toReleaseFromThis);
          await inventory.save();
          remainingToRelease -= toReleaseFromThis;
        }
      }
    }

    order.status = 'partially_rejected';
    await order.save();

    res.json({
      message: 'Order marked as partially rejected. Admin will handle this.',
      order
    });
    return;
  }

  // Handle confirmed status - deduct from actual inventory
  const session = await Inventory.startSession();
  session.startTransaction();

  try {
    for (const item of order.items) {
      const inventories = await Inventory.find({
        sku: item.sku,
        vendor: item.vendor
      }).session(session);

      if (!inventories || inventories.length === 0) {
        await session.abortTransaction();
        res.status(400).json({ message: `Inventory not found for SKU` });
        return;
      }

      // Calculate total available quantity
      const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);

      if (totalQuantity < item.quantity) {
        await session.abortTransaction();
        res.status(400).json({
          message: `Insufficient inventory for SKU at vendor`
        });
        return;
      }

      // Deduct from actual quantity and release reservation across multiple records
      let remainingToDeduct = item.quantity;
      for (const inventory of inventories) {
        if (remainingToDeduct <= 0) break;

        const toDeductFromThis = Math.min(inventory.quantity, remainingToDeduct);
        const toReleaseFromThis = Math.min(inventory.reservedQuantity || 0, remainingToDeduct);

        if (toDeductFromThis > 0) {
          inventory.quantity -= toDeductFromThis;
          inventory.reservedQuantity = Math.max(0, (inventory.reservedQuantity || 0) - toReleaseFromThis);
          await inventory.save({ session });

          await InventoryHistory.create([{
            inventory: inventory._id,
            sku: item.sku,
            fromVendor: item.vendor,
            quantity: toDeductFromThis,
            type: 'deduct_from_order',
            reason: `Order ${order._id}: Sold ${toDeductFromThis} units`,
            referenceId: order._id
          }], { session });

          // Check for low stock after deduction
          if (inventory.quantity < 30 && inventory.vendor) {
            const sku = await Sku.findById(item.sku);
            const vendor = await Vendor.findById(inventory.vendor);
            if (sku && vendor) {
              emitLowStockNotification(vendor.name, sku.title, inventory.quantity);
            }
          }

          remainingToDeduct -= toDeductFromThis;
        }
      }
    }

    order.status = 'confirmed';
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Order confirmed successfully',
      order
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error confirming order:', error);
    res.status(500).json({
      message: 'Internal server error while confirming order',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// 4.GET PARTIALLY REJECTED ORDERS FOR ADMIN
export const getPartiallyRejectedOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await Order.find({ status: 'partially_rejected' })
      .populate('user')
      .populate('vendor')
      .populate('items.sku')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Order.countDocuments({ status: 'partially_rejected' });

    res.json({
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching partially rejected orders:', error);
    res.status(500).json({ message: 'Internal server error while fetching partially rejected orders' });
  }
});

// 5. Admin updates pickup address for partially rejected orders
export const adminUpdatePickupAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, vendorId, pickupAddress } = req.body;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  // Check if order is partially rejected
  if (order.status !== 'partially_rejected') {
    res.status(400).json({ message: 'Order is not partially rejected' });
    return;
  }

  // Update vendor and pickup address
  order.vendor = vendorId;
  order.pickupAddress = pickupAddress;

  await order.save();

  res.json({
    message: 'Pickup address updated successfully',
    order
  });
});

// WALK-IN ORDER (OFFLINE) - SOLO OR COMBO PRODUCT
export const createWalkInOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, phone, dob, vendorId, productId, quantity } = req.body;

  // Validate vendor exists
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found' });
    return;
  }

  // Validate product exists
  const product = await Product.findById(productId).populate('skus.sku');
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  if (!product.active) {
    res.status(400).json({ message: 'Product is not active' });
    return;
  }

  const orderQuantity = quantity || 1;
  const productSkus = product.skus.map(s => s.sku);

  // Check stock availability for all SKUs
  let total = 0;
  const orderItems = [];

  for (const skuRef of productSkus) {
    const sku = await Sku.findById(skuRef);
    if (!sku) {
      res.status(404).json({ message: `SKU not found in product` });
      return;
    }

    // Check inventory availability across all records (considering reservations)
    const inventories = await Inventory.find({
      sku: skuRef,
      vendor: vendorId
    });

    if (!inventories || inventories.length === 0) {
      res.status(400).json({
        message: `SKU ${sku.title} not available at this vendor`
      });
      return;
    }

    // Calculate total available quantity across all inventory records
    const totalAvailableQuantity = inventories.reduce((sum, inv) => {
      return sum + (inv.quantity - (inv.reservedQuantity || 0));
    }, 0);

    if (totalAvailableQuantity < orderQuantity) {
      res.status(400).json({
        message: `Insufficient stock for ${sku.title}. Available: ${totalAvailableQuantity}, Requested: ${orderQuantity}`
      });
      return;
    }

    const price = sku.mrp || 0;
    orderItems.push({
      sku: skuRef,
      quantity: orderQuantity,
      price: price,
      vendor: vendorId
    });

    total += price * orderQuantity;
  }

  // Find or create temporary user
  let user = await User.findOne({ phone, temporaryUser: true });

  if (!user) {
    const userCount = await User.countDocuments();
    const permanentId = `U${(1000 + userCount + 1).toString().slice(-4)}`;

    user = await User.create({
      permanentId,
      name,
      phone,
      dob,
      temporaryUser: true,
      role: 'user'
    });
  }

  const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const order = await Order.create({
      user: user._id,
      vendor: vendorId,
      product: productId,
      items: orderItems,
      totalAmount: total,
      paymentMethod: 'cash',
      status: 'pending_verification', // Will be confirmed when bill is generated
      orderCode,
      orderType: 'walk_in'
    });

    res.status(201).json({ user, order });
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];

      res.status(400).json({
        message: `Duplicate key error: ${duplicateField} with value '${duplicateValue}' already exists`,
        error: 'DUPLICATE_KEY_ERROR',
        field: duplicateField,
        value: duplicateValue
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        error: error.message,
        details: Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      });
      return;
    }

    console.error('Error creating walk-in order:', error);
    res.status(500).json({
      message: 'Internal server error while creating walk-in order',
      error: error.message
    });
  }
});

// 12. GET ORDERS BY VENDOR ID
export const getOrdersByVendorId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ vendor: req.params.vendorId })
    .populate('user')
    .populate('vendor')
    .populate('items.sku')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await Order.countDocuments({ vendor: req.params.vendorId });

  res.json({
    data: orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});

// GENERATE BILL FOR WALK-IN ORDER (DEDUCT INVENTORY)
export const generateBill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId, cashAmount } = req.body;

  const cashAmountNum = Number(cashAmount);
  if (isNaN(cashAmountNum)) {
    res.status(400).json({ message: 'Invalid cash amount provided' });
    return;
  }

  const order = await Order.findById(orderId).populate('user').populate('vendor');
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.orderType !== 'walk_in') {
    res.status(400).json({ message: 'This API is only for walk-in orders' });
    return;
  }

  if (order.status === 'confirmed') {
    res.status(400).json({ message: 'Bill already generated for this order' });
    return;
  }

  const session = await Inventory.startSession();
  session.startTransaction();

  try {
    // Deduct inventory for each item across multiple records
    for (const item of order.items) {
      const inventories = await Inventory.find({
        vendor: order.vendor,
        sku: item.sku
      }).session(session);

      if (!inventories || inventories.length === 0) {
        await session.abortTransaction();
        res.status(400).json({ message: `Inventory not found for SKU` });
        return;
      }

      // Calculate total available quantity
      const totalAvailableQuantity = inventories.reduce((sum, inv) => {
        return sum + (inv.quantity - (inv.reservedQuantity || 0));
      }, 0);

      if (totalAvailableQuantity < item.quantity) {
        await session.abortTransaction();
        res.status(400).json({
          message: `Insufficient inventory for SKU. Available: ${totalAvailableQuantity}`
        });
        return;
      }

      // Deduct from multiple inventory records if needed
      let remainingToDeduct = item.quantity;
      for (const inventory of inventories) {
        if (remainingToDeduct <= 0) break;

        const availableInThisRecord = inventory.quantity - (inventory.reservedQuantity || 0);
        const toDeductFromThis = Math.min(availableInThisRecord, remainingToDeduct);

        if (toDeductFromThis > 0) {
          inventory.quantity = Math.max(0, inventory.quantity - toDeductFromThis);
          await inventory.save({ session });

          await InventoryHistory.create([{
            inventory: inventory._id,
            sku: item.sku,
            fromVendor: order.vendor,
            quantity: toDeductFromThis,
            type: 'deduct_from_order',
            reason: `Walk-in Order ${order._id}: Sold ${toDeductFromThis} units`,
            referenceId: order._id
          }], { session });

          remainingToDeduct -= toDeductFromThis;
        }
      }
    }

    // Update cash amount
    let cashEntry = await CashAmount.findOne({ vendorId: (order.vendor as any)._id }).session(session);

    if (cashEntry) {
      cashEntry.cashAmount += cashAmountNum;
      cashEntry.orderId = order._id;
      cashEntry.billGeneratedAt = new Date();
      await cashEntry.save({ session });
    } else {
      await CashAmount.create([{
        vendorId: (order.vendor as any)._id,
        cashAmount: cashAmountNum,
        orderId: order._id
      }], { session });
      cashEntry = await CashAmount.findOne({ vendorId: (order.vendor as any)._id }).session(session);
    }

    order.status = 'confirmed';
    await order.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message: 'Bill generated successfully',
      order,
      cashEntry
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error generating bill:', error);
    res.status(500).json({
      message: 'Internal server error while generating bill',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

export const getVendorCashBalance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;

  if (!vendorId) {
    res.status(400).json({ message: 'Vendor ID is required' });
    return;
  }

  const cashEntry = await CashAmount.findOne({ vendorId });

  if (!cashEntry) {
    res.status(404).json({ message: 'Vendor cash entry not found' });
    return;
  }

  res.status(200).json({
    vendorId,
    cashAmount: cashEntry.cashAmount,
    lastUpdated: cashEntry.billGeneratedAt
  });
});

// Deduct amount when vendor purchases from admin - admin will run this api
export const deductVendorCash = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId, amount, reason } = req.body;

  const adminUser = (req as any).user;
  if (!adminUser) {
    res.status(401).json({ message: 'Unauthorized: Admin user not found' });
    return;
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum)) {
    res.status(400).json({ message: 'Invalid amount provided' });
    return;
  }

  let cashEntry = await CashAmount.findOne({ vendorId });

  if (!cashEntry) {
    res.status(404).json({ message: 'Vendor cash entry not found' });
    return;
  }

  if (cashEntry.cashAmount < amountNum) {
    res.status(400).json({ message: 'Insufficient balance in vendor cash bank' });
    return;
  }

  const previousAmount = cashEntry.cashAmount;

  cashEntry.cashAmount -= amountNum;
  cashEntry.billGeneratedAt = new Date();
  await cashEntry.save();

  await CashDeductionHistory.create({
    vendorId,
    amount: amountNum,
    deductedBy: adminUser._id,
    reason: reason || 'Cash deduction by admin',
  });

  res.status(200).json({
    message: 'Amount deducted successfully',
    cashEntry,
    deduction: {
      vendorId,
      amount: amountNum,
      previousAmount,
      newAmount: cashEntry.cashAmount,
      deductedBy: adminUser._id,
      reason: reason || 'Cash deduction by admin',
    }
  });
});

// GET CASH DEDUCTION HISTORY FOR A SPECIFIC VENDOR
export const getVendorCashDeductionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const history = await CashDeductionHistory.find({ vendorId })
      .populate('deductedBy', 'name email') // Populate admin info
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CashDeductionHistory.countDocuments({ vendorId });

    res.status(200).json({
      data: history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendor cash deduction history:', error);
    res.status(500).json({ message: 'Internal server error while fetching vendor cash deduction history' });
  }
});

// GET CASH DEDUCTION HISTORY
export const getCashDeductionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { vendorId } = req.query;
  const filter: any = {};
  if (vendorId) {
    filter.vendorId = vendorId;
  }

  try {
    const history = await CashDeductionHistory.find(filter)
      .populate('vendorId', 'name phone') // Populate vendor info
      .populate('deductedBy', 'name email') // Populate admin info
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CashDeductionHistory.countDocuments(filter);

    res.status(200).json({
      data: history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching cash deduction history:', error);
    res.status(500).json({ message: 'Internal server error while fetching cash deduction history' });
  }
});

// GET ALL ORDERS
export const getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await Order.find()
      .populate('user')
      .populate('vendor')
      .populate('items.sku')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Order.countDocuments();

    res.json({
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error while fetching orders' });
  }
});

export const getUserPreviousOrders = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const paramUserId = (req.params as { userId?: string }).userId || (req.query.userId as string);
    const effectiveUserId = paramUserId || (req.user?._id?.toString() ?? '');

    if (!effectiveUserId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }

    if (!Types.ObjectId.isValid(effectiveUserId)) {
      res.status(400).json({ message: 'Invalid userId' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isSameUser = req.user?._id?.toString() === effectiveUserId;
    if (!isAdmin && !isSameUser) {
      res.status(403).json({ message: 'Not authorized to view other users orders' });
      return;
    }

    const limitParam = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 5;

    type PreviousOrderLean = {
      _id: Types.ObjectId;
      createdAt?: Date;
      orderCode?: string;
      orderVFC?: string;
      status: string;
      totalAmount: number;
      discountAmount?: number;
      promoCode?: string;
    };

    const orders = await Order.find({ user: new Types.ObjectId(effectiveUserId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderCode orderVFC status totalAmount discountAmount promoCode vendor createdAt items')
      .populate('vendor', 'name email phone')
      .populate('items.sku', 'title')
      .lean<PreviousOrderLean[]>();

    res.json({
      data: orders,
      metadata: {
        userId: effectiveUserId,
        limit,
        returnedCount: orders.length,
        latestOrderDate: orders.length ? orders[0].createdAt ?? null : null
      }
    });
  }
);

// GET ORDER BY ID
export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id)
    .populate('user')
    .populate('vendor')
    .populate('items.sku');

  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  res.json(order);
});

// GET ORDERS BY USER ID
export const getOrdersByUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.params.userId })
    .populate('user')
    .populate('vendor')
    .populate('items.sku')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await Order.countDocuments({ user: req.params.userId });

  res.json({
    data: orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  });
});

// CHECK PRODUCT AVAILABILITY AT VENDOR
export const checkProductStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId, vendorId, quantity } = req.body;

  if (!productId || !vendorId) {
    res.status(400).json({ message: 'productId and vendorId are required' });
    return;
  }

  const requestedQuantity = quantity || 1;

  // Get product details
  const product = await Product.findById(productId).populate('skus.sku');
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  // Check each SKU
  const skuDetails = [];
  for (const skuRef of product.skus.map(s => s.sku)) {
    const sku = await Sku.findById(skuRef);
    const inventories = await Inventory.find({
      sku: skuRef,
      vendor: vendorId
    });

    const totalQty = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
    const totalReserved = inventories.reduce((sum, inv) => sum + (inv.reservedQuantity || 0), 0);
    const available = totalQty - totalReserved;

    skuDetails.push({
      skuId: skuRef,
      skuTitle: sku?.title || 'Unknown',
      totalInventoryRecords: inventories.length,
      totalQuantity: totalQty,
      reservedQuantity: totalReserved,
      availableQuantity: available,
      inventoryDetails: inventories.map(inv => ({
        quantity: inv.quantity,
        reserved: inv.reservedQuantity || 0
      }))
    });
  }

  const result = await checkProductAvailability(productId, vendorId, requestedQuantity);

  res.json({
    ...result,
    productId,
    productTitle: product.title,
    vendorId,
    requestedQuantity,
    skuDetails
  });
});

// CANCEL ORDER AND RELEASE RESERVATIONS
export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  if (order.status === 'confirmed' || order.status === 'completed') {
    res.status(400).json({ message: 'Cannot cancel confirmed or completed orders' });
    return;
  }

  if (order.status === 'cancelled') {
    res.status(400).json({ message: 'Order already cancelled' });
    return;
  }

  const session = await Inventory.startSession();
  session.startTransaction();

  try {
    // Release reservations for online orders across multiple inventory records
    if (order.orderType === 'online' && order.status === 'pending_verification') {
      for (const item of order.items) {
        const inventories = await Inventory.find({
          sku: item.sku,
          vendor: item.vendor,
          reservedQuantity: { $gt: 0 }
        }).session(session);

        let remainingToRelease = item.quantity;
        for (const inventory of inventories) {
          if (remainingToRelease <= 0) break;

          const toReleaseFromThis = Math.min(inventory.reservedQuantity || 0, remainingToRelease);
          if (toReleaseFromThis > 0) {
            inventory.reservedQuantity = Math.max(0, (inventory.reservedQuantity || 0) - toReleaseFromThis);
            await inventory.save({ session });
            remainingToRelease -= toReleaseFromThis;
          }
        }
      }
    }

    order.status = 'cancelled';
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error cancelling order:', error);
    res.status(500).json({
      message: 'Internal server error while cancelling order',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});
