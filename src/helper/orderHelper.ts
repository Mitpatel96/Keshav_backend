import Inventory from "../models/Inventory";
import Product from "../models/Product";
import Sku from "../models/Sku";

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
