import { Types } from "mongoose";
import Inventory from "../models/Inventory";
import Product from "../models/Product";
import Sku from "../models/Sku";

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  skuId?: string; // For solo products: specific variant (SKU) selected by user
}

export interface PreparedCheckoutItem {
  product: Types.ObjectId;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isCombo: boolean;
  components: Array<{
    sku: Types.ObjectId;
    quantityPerBundle: number;
    skuTitle: string;
    unitPrice: number;
  }>;
}

export interface CheckoutSummary {
  vendor: Types.ObjectId;
  items: PreparedCheckoutItem[];
  subtotal: number;
  productIds: Types.ObjectId[];
}

export async function buildCheckoutSummary(
  items: CheckoutItemInput[],
  vendorId: string
): Promise<CheckoutSummary> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required");
  }

  const vendorObjectId = new Types.ObjectId(vendorId);
  const preparedItems: PreparedCheckoutItem[] = [];

  for (const item of items) {
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }

    if (!Types.ObjectId.isValid(item.productId)) {
      throw new Error(`Invalid productId: ${item.productId}`);
    }

    const product = await Product.findById(item.productId).populate('skus.sku');
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (!product.active) {
      throw new Error(`Product inactive: ${product.title}`);
    }

    if (!Array.isArray(product.skus) || product.skus.length === 0) {
      throw new Error(`Product ${product.title} has no SKUs configured`);
    }

    const components = [];
    let unitPriceAccumulator = 0;

    if (product.isCombo) {
      // Combo product: process all SKUs
      for (const skuEntry of product.skus) {
        const skuDoc = skuEntry.sku as any;
        const skuId = new Types.ObjectId(skuDoc?._id ?? skuEntry.sku);
        const sku = skuDoc?._id ? skuDoc : await Sku.findById(skuId);
        if (!sku) {
          throw new Error(`SKU not found for product ${product.title}`);
        }

        const inventories = await Inventory.find({
          sku: skuId,
          vendor: vendorObjectId
        });

        if (!inventories || inventories.length === 0) {
          throw new Error(`SKU ${sku.title} not available at this vendor`);
        }

        const availableQuantity = inventories.reduce((sum, inv) => {
          const reserved = inv.reservedQuantity || 0;
          return sum + Math.max(0, inv.quantity - reserved);
        }, 0);

        if (availableQuantity < quantity) {
          throw new Error(
            `Insufficient stock for ${sku.title}. Available: ${availableQuantity}, Requested: ${quantity}`
          );
        }

        const skuPrice = sku.mrp || 0;
        unitPriceAccumulator += skuPrice;
        components.push({
          sku: skuId,
          quantityPerBundle: 1,
          skuTitle: sku.title,
          unitPrice: skuPrice
        });
      }
    } else {
      // Solo product: process only the selected SKU (or first SKU if not specified)
      let selectedSkuId: Types.ObjectId;

      if (item.skuId) {
        // Validate that the provided skuId belongs to this product
        const skuEntry = product.skus.find((entry: any) => {
          const entrySkuId = entry.sku?._id?.toString() ?? entry.sku?.toString();
          return entrySkuId === item.skuId;
        });

        if (!skuEntry) {
          throw new Error(`SKU ${item.skuId} does not belong to product ${product.title}`);
        }

        if (!Types.ObjectId.isValid(item.skuId)) {
          throw new Error(`Invalid skuId: ${item.skuId}`);
        }

        selectedSkuId = new Types.ObjectId(item.skuId);
      } else {
        // Use first SKU if no skuId provided
        const firstSku = product.skus[0];
        const firstSkuId = firstSku?.sku;
        if (!firstSkuId) {
          throw new Error(`Product ${product.title} has no SKUs`);
        }
        selectedSkuId = new Types.ObjectId(
          (firstSkuId as any)?._id?.toString() ?? firstSkuId.toString()
        );
      }

      const sku = await Sku.findById(selectedSkuId);
      if (!sku) {
        throw new Error(`SKU not found for product ${product.title}`);
      }

      const inventories = await Inventory.find({
        sku: selectedSkuId,
        vendor: vendorObjectId
      });

      if (!inventories || inventories.length === 0) {
        throw new Error(`SKU ${sku.title} not available at this vendor`);
      }

      const availableQuantity = inventories.reduce((sum, inv) => {
        const reserved = inv.reservedQuantity || 0;
        return sum + Math.max(0, inv.quantity - reserved);
      }, 0);

      if (availableQuantity < quantity) {
        throw new Error(
          `Insufficient stock for ${sku.title}. Available: ${availableQuantity}, Requested: ${quantity}`
        );
      }

      const skuPrice = sku.mrp || 0;
      unitPriceAccumulator = skuPrice;
      components.push({
        sku: selectedSkuId,
        quantityPerBundle: 1,
        skuTitle: sku.title,
        unitPrice: skuPrice
      });
    }

    const unitPrice = product.isCombo
      ? unitPriceAccumulator
      : (product.price && product.price > 0 ? product.price : unitPriceAccumulator);

    preparedItems.push({
      product: new Types.ObjectId(item.productId),
      productTitle: product.title,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
      isCombo: product.isCombo,
      components
    });
  }

  const subtotal = preparedItems.reduce((sum, entry) => sum + entry.subtotal, 0);
  return {
    vendor: vendorObjectId,
    items: preparedItems,
    subtotal,
    productIds: preparedItems.map((entry) => entry.product)
  };
}

// Helper function to check product availability at vendor
export async function checkProductAvailability(productId: string, vendorId: string, requestedQuantity: number) {
  const product = await Product.findById(productId).populate('skus.sku');
  if (!product || !product.active) {
    return { available: false, message: 'Product not found or inactive' };
  }

  const productSkus = product.skus.map(s => s.sku);
  const unavailableSkus = [];

  for (const skuRef of productSkus) {
    const sku = await Sku.findById(skuRef);
    if (!sku) {
      return { available: false, message: 'SKU not found in product' };
    }

    // Find ALL inventory records for this SKU at this vendor
    const inventories = await Inventory.find({
      sku: skuRef,
      vendor: vendorId,
      status: 'confirmed'
    });

    if (!inventories || inventories.length === 0) {
      unavailableSkus.push(sku.title);
      continue;
    }

    // Calculate total available quantity across all inventory records
    const totalAvailableQuantity = inventories.reduce((sum, inv) => {
      return sum + (inv.quantity - (inv.reservedQuantity || 0));
    }, 0);

    if (totalAvailableQuantity < requestedQuantity) {
      unavailableSkus.push(`${sku.title} (Available: ${totalAvailableQuantity}, Requested: ${requestedQuantity})`);
    }
  }

  if (unavailableSkus.length > 0) {
    return {
      available: false,
      message: `Insufficient stock for: ${unavailableSkus.join(', ')}`
    };
  }

  return { available: true, message: 'Product available' };
}
