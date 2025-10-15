import mongoose, { Schema, Document } from 'mongoose';

export interface ISku extends Document {
  skuId: string; // auto generated
  title: string;
  category?: string;
  brand?: string;
  variants?: any; // { color: [], ram: [] }
  images?: string[];
  basePrice: number;
  mrp?: number;
  taxPercent?: number;
  active: boolean;
}

const SkuSchema: Schema = new Schema(
  {
    skuId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    category: { type: String },
    brand: { type: String },
    variants: { type: Schema.Types.Mixed },
    images: [{ type: String }],
    basePrice: { type: Number, required: true, default: 0 },
    mrp: { type: Number },
    taxPercent: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<ISku>('Sku', SkuSchema);

