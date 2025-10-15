// models/Payment.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string;
  receiptUrl?: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: String, required: true },
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'inr' },
    status: { type: String, default: 'pending' },
    stripePaymentIntentId: { type: String, required: true },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', paymentSchema);
