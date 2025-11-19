import mongoose, { Schema, Document } from 'mongoose';

export interface ISku extends Document {
  skuId: string; // auto generated
  title: string;
  brand?: string;
  category?: Schema.Types.ObjectId;
  images?: string[];
  mrp?: number;
  unit?: string; // e.g., 'ml', 'kg', 'litre', 'g', 'piece'
  unitValue?: number; // e.g., 1, 5, 10, 500, 1000
  active: boolean;
}

const SkuSchema: Schema = new Schema(
  {
    skuId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    brand: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    images: [{ type: String }],
    mrp: { type: Number },
    unit: { type: String }, // e.g., 'ml', 'kg', 'litre', 'g', 'piece'
    unitValue: { type: Number }, // e.g., 1, 5, 10, 500, 1000
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<ISku>('Sku', SkuSchema);
