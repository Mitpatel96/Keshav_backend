// models/Payment.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPaymentItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  components: Array<{
    sku: Types.ObjectId;
    quantityPerBundle: number;
  }>;
}

export interface IPayment extends Document {
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  items: Types.DocumentArray<IPaymentItem & Document>;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled';
  stripePaymentIntentId: string;
  promoCode?: string;
  promoCodeId?: Types.ObjectId;
  promoBatchId?: Types.ObjectId;
  promoDiscountType?: 'PERCENTAGE' | 'FLAT';
  promoDiscountValue?: number;
  receiptUrl?: string;
  order?: Types.ObjectId;
}

const PaymentItemSchema = new Schema<IPaymentItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    components: [
      {
        sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
        quantityPerBundle: { type: Number, required: true }
      }
    ]
  },
  { _id: true }
);

const PaymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: { type: [PaymentItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'inr' },
    status: {
      type: String,
      enum: ['pending', 'requires_action', 'succeeded', 'failed', 'cancelled'],
      default: 'pending'
    },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    promoCode: { type: String },
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode' },
    promoBatchId: { type: Schema.Types.ObjectId, ref: 'PromoBatch' },
    promoDiscountType: { type: String, enum: ['PERCENTAGE', 'FLAT'] },
    promoDiscountValue: { type: Number },
    receiptUrl: { type: String },
    order: { type: Schema.Types.ObjectId, ref: 'Order' }
  },
  { timestamps: true }
);

PaymentSchema.index({ user: 1, vendor: 1, createdAt: -1 });
PaymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
