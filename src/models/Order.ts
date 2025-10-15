import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  user: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  items: Array<{ sku: Schema.Types.ObjectId; quantity: number; price: number; }>; 
  totalAmount: number;
  paymentMethod: 'online' | 'pickup';
  status: 'placed' | 'pending_pickup' | 'completed' | 'cancelled';
  verificationCode?: string; // 8-digit
}

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    items: [
      {
        sku: { type: Schema.Types.ObjectId, ref: 'Sku' },
        quantity: { type: Number },
        price: { type: Number }
      }
    ],
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['online', 'pickup'], default: 'online' },
    status: { type: String, enum: ['placed','pending_pickup','completed','cancelled'], default: 'placed' },
    verificationCode: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
