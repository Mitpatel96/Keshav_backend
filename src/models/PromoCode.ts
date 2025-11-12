import mongoose, { Document, Schema, Types } from 'mongoose';
import { IPromoBatch } from './PromoBatch';

export type PromoCodeStatus = 'UNUSED' | 'USED' | 'EXPIRED' | 'DEACTIVATED';

export interface IPromoCode extends Document {
    batch: IPromoBatch['_id'];
    code: string;
    status: PromoCodeStatus;
    usedBy?: Types.ObjectId[];
    usageLimit: number;
    usageCount: number;
    usedAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const PromoCodeSchema: Schema<IPromoCode> = new Schema(
    {
        batch: { type: Schema.Types.ObjectId, ref: 'PromoBatch', required: true, index: true },
        code: { type: String, required: true, unique: true },
        status: { type: String, enum: ['UNUSED', 'USED', 'EXPIRED', 'DEACTIVATED'], default: 'UNUSED' },
        usedBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
        usageLimit: { type: Number, default: 1 },
        usageCount: { type: Number, default: 0 },
        usedAt: { type: Date },
        metadata: { type: Schema.Types.Mixed }
    },
    {
        timestamps: true
    }
);

PromoCodeSchema.index({ code: 1 }, { unique: true });
PromoCodeSchema.index({ status: 1 });

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);

