import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  sku: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  admin: Schema.Types.ObjectId;
  quantity: number;
  reservedQuantity: number; // Track reserved inventory for pending orders
  price: number;
}

const InventorySchema: Schema = new Schema(
  {
    sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    admin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    quantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 }
  },
  { timestamps: true }
);

InventorySchema.index({ sku: 1, vendor: 1 });
InventorySchema.index({ sku: 1, admin: 1 });

export default mongoose.model<IInventory>('Inventory', InventorySchema);