import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem {
    product: Types.ObjectId;
    sku?: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productTitle: string;
    skuTitle?: string;
    image?: string;
    isCombo: boolean;
    components?: Array<{
        sku: Types.ObjectId;
        quantity: number;
    }>;
}

export interface ICart extends Document {
    user: Types.ObjectId;
    items: Types.DocumentArray<ICartItem & Document>;
    subtotal: number;
    totalQuantity: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
    {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: { type: Schema.Types.ObjectId, ref: 'Sku' },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        productTitle: { type: String, required: true },
        skuTitle: { type: String },
        image: { type: String },
        isCombo: { type: Boolean, default: false },
        components: [
            {
                sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
                quantity: { type: Number, default: 1, min: 1 }
            }
        ]
    },
    {
        _id: true,
        timestamps: true
    }
);

const CartSchema = new Schema<ICart>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        items: [CartItemSchema],
        subtotal: { type: Number, default: 0 },
        totalQuantity: { type: Number, default: 0 },
        currency: { type: String, default: 'AUD' }
    },
    {
        timestamps: true
    }
);

CartSchema.index({ user: 1 }, { unique: true });
CartSchema.index({ 'items.product': 1 });

export default mongoose.model<ICart>('Cart', CartSchema);

