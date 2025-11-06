import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    title: string;
    description?: string;
    images: string[];
    isCombo: boolean;
    quantity: number;
    skus: Array<{
        sku: Schema.Types.ObjectId;
    }>;
    price: number;
    active: boolean;
}

const ProductSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        images: [{ type: String }],
        isCombo: { type: Boolean, default: false },
        quantity: { type: Number, default: 1 },
        skus: [{ sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true }, }],
        price: { type: Number, required: true },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
