import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingInventoryTransfer extends Document {
    sku: Schema.Types.ObjectId;
    vendor: Schema.Types.ObjectId;
    admin: Schema.Types.ObjectId;
    quantity: number;
    status: 'pending' | 'accepted' | 'rejected';
    rejectionReason?: string;
    transferredAt?: Date;
    respondedAt?: Date;
}

const PendingInventoryTransferSchema: Schema = new Schema(
    {
        sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        quantity: { type: Number, required: true, min: 1 },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        rejectionReason: { type: String },
        transferredAt: { type: Date, default: Date.now },
        respondedAt: { type: Date }
    },
    { timestamps: true }
);

PendingInventoryTransferSchema.index({ sku: 1, vendor: 1, status: 1 });

export default mongoose.model<IPendingInventoryTransfer>('PendingInventoryTransfer', PendingInventoryTransferSchema);
