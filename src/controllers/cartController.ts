import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Types } from 'mongoose';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Sku from '../models/Sku';
import Inventory from '../models/Inventory';

interface AuthenticatedRequest<T = any> extends Request {
  user?: {
    _id: Types.ObjectId | string;
  };
  body: T;
}

const objectId = (value: Types.ObjectId | string) =>
  typeof value === 'string' ? new Types.ObjectId(value) : value;

const ensureObjectId = (value: string, fieldName: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldName} is not a valid ObjectId`);
  }
  return new Types.ObjectId(value);
};

const computeCartTotals = (cart: any) => {
  if (!cart || !Array.isArray(cart.items)) {
    return;
  }

  let subtotal = 0;
  let totalQuantity = 0;

  cart.items.forEach((item: any) => {
    subtotal += item.subtotal || 0;
    totalQuantity += item.quantity || 0;
  });

  cart.subtotal = subtotal;
  cart.totalQuantity = totalQuantity;
};

const findOrCreateCart = async (userId: Types.ObjectId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
      subtotal: 0,
      totalQuantity: 0
    });
  }
  return cart;
};

const resolveSkuForProduct = async (product: any): Promise<{ skuId?: Types.ObjectId; skuDoc?: any }> => {
  if (product.isCombo) {
    return { skuId: undefined, skuDoc: undefined };
  }

  const skus = product.skus || [];
  if (skus.length === 0) {
    throw new Error('No SKU linked to product');
  }

  const firstSku = skus[0];
  const skuId = ensureObjectId(firstSku?.sku?._id ?? firstSku?.sku, 'skuId');
  const skuDoc = await Sku.findById(skuId);
  if (!skuDoc) {
    throw new Error('SKU not found');
  }
  if (skuDoc.active === false) {
    throw new Error('Selected SKU is inactive');
  }
  return { skuId, skuDoc };
};

const ensureStockAvailability = async (
  product: any,
  desiredQuantity: number,
  skuId?: Types.ObjectId
) => {
  const skuEntries: Array<{ skuId: Types.ObjectId; title: string }> = product.isCombo
    ? product.skus.map((entry: any) => ({
      skuId: new Types.ObjectId(entry.sku._id ?? entry.sku),
      title: entry.sku.title ?? entry.sku?.toString() ?? 'SKU'
    }))
    : [
      {
        skuId: skuId as Types.ObjectId,
        title:
          product.skus
            .map((entry: any) => entry.sku)
            .find((value: any) => {
              const id = value?._id ?? value;
              return id?.toString() === (skuId as Types.ObjectId).toString();
            })?.title ?? 'SKU'
      }
    ];

  for (const entry of skuEntries) {
    const inventories = await Inventory.find({
      sku: entry.skuId
    });

    if (!inventories || inventories.length === 0) {
      throw new Error(`SKU ${entry.title} not available`);
    }

    const availableQuantity = inventories.reduce((sum, inv) => {
      const reserved = inv.reservedQuantity || 0;
      return sum + Math.max(0, inv.quantity - reserved);
    }, 0);

    if (availableQuantity < desiredQuantity) {
      throw new Error(
        `Insufficient stock for ${entry.title}. Available: ${availableQuantity}, Requested: ${desiredQuantity}`
      );
    }
  }
};

const serializeCart = (cart: any) => {
  if (!cart) return null;
  const json = cart.toObject ? cart.toObject() : cart;
  return {
    _id: json._id,
    user: json.user,
    items: (json.items || []).map((item: any) => ({
      _id: item._id,
      product: item.product,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      productTitle: item.productTitle,
      skuTitle: item.skuTitle,
      image: item.image,
      isCombo: item.isCombo,
      components: item.components
    })),
    subtotal: json.subtotal,
    totalQuantity: json.totalQuantity,
    currency: json.currency,
    updatedAt: json.updatedAt,
    createdAt: json.createdAt
  };
};

type CartItemPayload = {
  productId: string;
  quantity?: number;
  skuId?: string; // For solo products: user selects a specific variant (SKU)
};

export const getCart = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = objectId(req.user._id);
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.json({
      cart: {
        _id: null,
        user: userId,
        items: [],
        subtotal: 0,
        totalQuantity: 0,
        currency: 'INR'
      }
    });
    return;
  }

  res.json({ cart: serializeCart(cart) });
});

export const addCartItem = asyncHandler(
  async (req: AuthenticatedRequest<CartItemPayload>, res: Response): Promise<void> => {
    const { productId, quantity = 1, skuId } = req.body;

    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: 'productId is required' });
      return;
    }

    if (!Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: 'Invalid productId' });
      return;
    }

    const desiredQuantity = Number(quantity);
    if (!Number.isInteger(desiredQuantity) || desiredQuantity <= 0) {
      res.status(400).json({ message: 'Quantity must be a positive integer' });
      return;
    }

    const userId = objectId(req.user._id);
    const product = await Product.findById(productId).populate('skus.sku');
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    if (!product.active) {
      res.status(400).json({ message: 'Product is inactive' });
      return;
    }

    // For solo products, if skuId is provided, use it; otherwise use first SKU
    let resolvedSkuId: Types.ObjectId | undefined;
    let skuDoc: any;

    if (product.isCombo) {
      // Combo products don't have a single SKU
      resolvedSkuId = undefined;
      skuDoc = undefined;
    } else {
      // Solo product: use provided skuId or first SKU
      if (skuId) {
        // Validate that the provided skuId belongs to this product
        const skuEntry = product.skus.find((entry: any) => {
          const entrySkuId = entry.sku?._id?.toString() ?? entry.sku?.toString();
          return entrySkuId === skuId;
        });

        if (!skuEntry) {
          res.status(400).json({ message: `SKU ${skuId} does not belong to this product` });
          return;
        }

        if (!Types.ObjectId.isValid(skuId)) {
          res.status(400).json({ message: 'Invalid skuId' });
          return;
        }

        resolvedSkuId = new Types.ObjectId(skuId);
        skuDoc = await Sku.findById(resolvedSkuId);
        if (!skuDoc) {
          res.status(404).json({ message: 'SKU not found' });
          return;
        }
        if (skuDoc.active === false) {
          res.status(400).json({ message: 'Selected SKU is inactive' });
          return;
        }
      } else {
        // Use first SKU if no skuId provided
        const result = await resolveSkuForProduct(product);
        resolvedSkuId = result.skuId;
        skuDoc = result.skuDoc;
      }
    }

    await ensureStockAvailability(product, desiredQuantity, resolvedSkuId);

    const unitPrice = product.isCombo
      ? product.price || 0
      : product.price || skuDoc?.mrp || 0;
    const productTitle = product.title;
    const skuTitle = skuDoc?.title;
    const image =
      product.images?.[0] || (skuDoc && Array.isArray(skuDoc.images) && skuDoc.images.length ? skuDoc.images[0] : '');

    const cart = await findOrCreateCart(userId);

    // For solo products, match by product + sku; for combo products, match by product only
    const existingIndex = cart.items.findIndex((item: any) => {
      const sameProduct = item.product.toString() === productId;
      if (product.isCombo) {
        // Combo products: match by product only
        return sameProduct && item.isCombo;
      } else {
        // Solo products: match by product + sku
        const sameSku =
          (!item.sku && !resolvedSkuId) ||
          (item.sku && resolvedSkuId && item.sku.toString() === resolvedSkuId.toString());
        return sameProduct && sameSku && !item.isCombo;
      }
    });

    if (existingIndex >= 0) {
      const existingItem = cart.items[existingIndex];
      await ensureStockAvailability(product, desiredQuantity, resolvedSkuId);
      existingItem.quantity = desiredQuantity;
      existingItem.unitPrice = unitPrice;
      existingItem.subtotal = unitPrice * desiredQuantity;
      existingItem.productTitle = productTitle;
      existingItem.skuTitle = skuTitle;
      existingItem.image = image;
      existingItem.isCombo = product.isCombo;
      existingItem.components = product.isCombo
        ? product.skus.map((entry: any) => ({
          sku: new Types.ObjectId(entry.sku._id ?? entry.sku),
          quantity: 1
        }))
        : undefined;
    } else {
      cart.items.push({
        product: product._id,
        sku: resolvedSkuId,
        quantity: desiredQuantity,
        unitPrice,
        subtotal: unitPrice * desiredQuantity,
        productTitle,
        skuTitle,
        image,
        isCombo: product.isCombo,
        components: product.isCombo
          ? product.skus.map((entry: any) => ({
            sku: new Types.ObjectId(entry.sku._id ?? entry.sku),
            quantity: 1
          }))
          : undefined
      } as any);
    }

    computeCartTotals(cart);
    await cart.save();

    res.status(existingIndex >= 0 ? 200 : 201).json({ cart: serializeCart(cart) });
  }
);

export const updateCartItemQuantity = asyncHandler(
  async (req: AuthenticatedRequest<{ quantity: number }>, res: Response): Promise<void> => {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!Types.ObjectId.isValid(itemId)) {
      res.status(400).json({ message: 'Invalid item id' });
      return;
    }

    const desiredQuantity = Number(quantity);
    if (!Number.isInteger(desiredQuantity) || desiredQuantity <= 0) {
      res.status(400).json({ message: 'Quantity must be a positive integer' });
      return;
    }

    const userId = objectId(req.user._id);
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const item = cart.items.id(itemId);
    if (!item) {
      res.status(404).json({ message: 'Cart item not found' });
      return;
    }

    const product = await Product.findById(item.product).populate('skus.sku');
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    await ensureStockAvailability(product, desiredQuantity, item.sku as Types.ObjectId);

    item.quantity = desiredQuantity;
    item.subtotal = item.unitPrice * desiredQuantity;

    computeCartTotals(cart);
    await cart.save();

    res.json({ cart: serializeCart(cart) });
  }
);

export const removeCartItem = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { itemId } = req.params;
  if (!Types.ObjectId.isValid(itemId)) {
    res.status(400).json({ message: 'Invalid item id' });
    return;
  }

  const userId = objectId(req.user._id);
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404).json({ message: 'Cart not found' });
    return;
  }

  const item = cart.items.id(itemId);
  if (!item) {
    res.status(404).json({ message: 'Cart item not found' });
    return;
  }

  item.deleteOne();

  computeCartTotals(cart);
  await cart.save();

  res.json({ cart: serializeCart(cart) });
});

export const clearCart = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = objectId(req.user._id);
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404).json({ message: 'Cart not found' });
    return;
  }

  cart.items = [] as any;
  cart.subtotal = 0;
  cart.totalQuantity = 0;
  await cart.save();

  res.json({ cart: serializeCart(cart) });
});

export const validateCartAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = objectId(req.user._id);
  const cart = await Cart.findOne({ user: userId });

  if (!cart || cart.items.length === 0) {
    res.status(404).json({ message: 'Cart is empty' });
    return;
  }

  const results: Array<{
    itemId: string;
    productId?: string;
    skuId?: string;
    requestedQuantity: number;
    available: boolean;
    message?: string;
    availableQuantity?: number;
  }> = [];

  for (const item of cart.items) {
    const resultBase = {
      itemId: item._id.toString(),
      productId: item.product?.toString(),
      skuId: item.sku?.toString(),
      requestedQuantity: item.quantity
    };

    const product = await Product.findById(item.product).populate('skus.sku');
    if (!product) {
      results.push({
        ...resultBase,
        available: false,
        message: 'Product no longer exists'
      });
      continue;
    }

    try {
      await ensureStockAvailability(
        product,
        item.quantity,
        product.isCombo ? undefined : (item.sku as Types.ObjectId | undefined)
      );

      results.push({
        ...resultBase,
        available: true
      });
    } catch (error: any) {
      const message = error?.message || 'Insufficient stock';
      const match = message.match(/Available:\s*(\d+)/i);
      const availableQuantity = match ? Number(match[1]) : undefined;

      results.push({
        ...resultBase,
        available: false,
        message,
        availableQuantity
      });
    }
  }

  const unavailableItems = results.filter((entry) => !entry.available);
  if (unavailableItems.length > 0) {
    res.status(409).json({
      available: false,
      items: results
    });
    return;
  }

  res.json({
    available: true,
    items: results
  });
});

