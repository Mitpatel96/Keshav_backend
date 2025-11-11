import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    title: string;
    description?: string;
    images: string[];
    isCombo: boolean;
    quantity: number;
    category: Schema.Types.ObjectId;
    skus: Array<{
        sku: Schema.Types.ObjectId;
    }>;
    price: number;
    strikeThroughPrice?: number;
    active: boolean;
}

const ProductSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        images: [{ type: String }],
        isCombo: { type: Boolean, default: false },
        quantity: { type: Number, default: 1 },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        skus: [{ sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true }, }],
        price: { type: Number, required: true },
        strikeThroughPrice: { type: Number, required: false, default: 0 },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Index for better query performance
ProductSchema.index({ category: 1, active: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
