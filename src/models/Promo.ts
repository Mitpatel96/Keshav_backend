import mongoose, { Schema, Document } from 'mongoose';

export interface IPromo extends Document {
  code: string;
  products: Schema.Types.ObjectId[];
  discountPercent?: number;
  discountAmount?: number;
  usageType: 'one-time' | 'count-limited' | 'multi';
  usageLimit?: number;
  usedCount: number;
  expiresAt?: Date;
  active: boolean;
}

const PromoSchema: Schema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Sku' }],
    discountPercent: { type: Number },
    discountAmount: { type: Number },
    usageType: { type: String, enum: ['one-time', 'count-limited', 'multi'], default: 'multi' },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IPromo>('Promo', PromoSchema);
