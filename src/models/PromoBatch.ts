import mongoose, { Document, Schema } from 'mongoose';

export type PromoUsageScope = 'PER_USER' | 'GLOBAL';
export type PromoDiscountType = 'PERCENTAGE' | 'FLAT';

export interface IPromoBatch extends Document {
    title: string;
    baseInput: string;
    baseLength: number;
    usageScope: PromoUsageScope;
    count: number;
    discountType: PromoDiscountType;
    discountValue: number;
    startDate: Date;
    endDate: Date;
    products: Schema.Types.ObjectId[];
    isActive: boolean;
    createdBy?: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PromoBatchSchema: Schema<IPromoBatch> = new Schema(
    {
        title: { type: String, required: true, trim: true }, // Original seed text supplied by admin (letters only) used when generating promo codes
        baseInput: { type: String, required: true }, // Cached length of baseInput to drive prefix validation and display format
        baseLength: { type: Number, required: true }, // Case selector: PER_USER = reusable per user, GLOBAL = single use globally
        usageScope: { type: String, enum: ['PER_USER', 'GLOBAL'], required: true }, 
        // which scenario this batch belongs to—PER_USER for case 1 (same code reusable by different users but once each), GLOBAL for case 2 (each code works only once total).
        count: { type: Number, required: true }, // Discount value interpretation: percentage or flat amount (currency)
        discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], required: true }, // Actual discount figure (percent or currency based on discountType)
        discountValue: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        products: [{ type: Schema.Types.ObjectId, ref: 'Product', required: true }],
        isActive: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    {
        timestamps: true
    }
);

PromoBatchSchema.index({ title: 1 });
PromoBatchSchema.index({ baseInput: 1 });
PromoBatchSchema.index({ isActive: 1, endDate: 1 });

export default mongoose.model<IPromoBatch>('PromoBatch', PromoBatchSchema);

