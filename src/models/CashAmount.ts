import mongoose, { Schema, Document } from 'mongoose';

export interface ICashAmount extends Document {
  vendorId: Schema.Types.ObjectId;
  cashAmount: number;
  orderId?: Schema.Types.ObjectId;
  billGeneratedAt: Date;
}

const CashAmountSchema: Schema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
    cashAmount: { type: Number, required: true, default: 0 },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    billGeneratedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<ICashAmount>('CashAmount', CashAmountSchema);