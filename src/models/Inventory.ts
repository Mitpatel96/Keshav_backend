import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  sku: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  quantity: number;
  price: number;
  status: 'pending' | 'available' | 'confirmed';
}

const InventorySchema: Schema = new Schema(
  {
    sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'available', 'confirmed'], default: 'pending' }
  },
  { timestamps: true }
);

export default mongoose.model<IInventory>('Inventory', InventorySchema);

