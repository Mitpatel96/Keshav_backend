import mongoose, { Schema, Document } from 'mongoose';

export interface ISku extends Document {
  skuId: string; // auto generated
  title: string;
  brand?: string;
  images?: string[];
  mrp?: number;
  active: boolean;
}

const SkuSchema: Schema = new Schema(
  {
    skuId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    brand: { type: String },
    images: [{ type: String }],
    mrp: { type: Number },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<ISku>('Sku', SkuSchema);

