import mongoose, { Schema, Document } from 'mongoose';

export interface ITrader extends Document {
    name: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
    active: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
}

const TraderSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        active: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    },
    { timestamps: true }
);

TraderSchema.index({ isDeleted: 1, active: 1 });

export default mongoose.model<ITrader>('Trader', TraderSchema);
