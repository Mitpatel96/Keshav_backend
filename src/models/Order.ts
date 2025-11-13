import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrder extends Document {
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  product?: Types.ObjectId;
  items: Array<{
    product?: Types.ObjectId;
    sku: Types.ObjectId;
    quantity: number;
    price: number;
    vendor?: Types.ObjectId;
  }>;
  totalAmount: number;
  paymentMethod: 'online' | 'pickup' | 'cash';
  status: 'placed' | 'pending_pickup' | 'pending_verification' | 'confirmed' | 'partially_rejected' | 'completed' | 'cancelled';
  orderVFC?: string; // 6-digit alphanumeric code for online purchases
  orderCode?: string; // Unique order code
  pickupAddress?: string; // Vendor address for pickup
  orderType: 'online' | 'walk_in'; // New field to distinguish order types
}

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        sku: { type: Schema.Types.ObjectId, ref: 'Sku' },
        quantity: { type: Number },
        price: { type: Number },
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' }
      }
    ],
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['online', 'pickup', 'cash'], default: 'online' },
    status: { type: String, enum: ['placed', 'pending_pickup', 'pending_verification', 'confirmed', 'partially_rejected', 'completed', 'cancelled'], default: 'placed' },
    orderVFC: { type: String }, // 6-digit alphanumeric code for online purchases
    orderCode: { type: String, unique: true }, // Unique order code
    pickupAddress: { type: String },
    orderType: { type: String, enum: ['online', 'walk_in'], default: 'online' }
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);