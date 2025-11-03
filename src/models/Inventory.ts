import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  sku: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  admin: Schema.Types.ObjectId;
  quantity: number;
  reservedQuantity: number; // Track reserved inventory for pending orders
  price: number;
  status: 'pending' | 'confirmed';
}

const InventorySchema: Schema = new Schema(
  {
    sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    admin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    quantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 }, 
    // price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'confirmed',
      validate: {
        validator: function (this: any) {
          if (this.admin && !this.vendor) {
            return this.status === 'confirmed';
          }
          return true;
        },
        message: 'Admin inventory must be confirmed'
      }
    }
  },
  { timestamps: true }
);

InventorySchema.index({ sku: 1, vendor: 1 });

export default mongoose.model<IInventory>('Inventory', InventorySchema);