import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryHistory extends Document {
    inventory: Schema.Types.ObjectId;
    sku: Schema.Types.ObjectId;
    fromAdmin?: Schema.Types.ObjectId;
    toVendor?: Schema.Types.ObjectId;
    fromVendor?: Schema.Types.ObjectId;
    quantity: number;
    type: 'transfer_initiated' | 'transfer_accepted' | 'transfer_rejected' | 'deduct_damage' | 'deduct_lost' | 'vendor_damage' | 'vendor_lost' | 'deduct_from_order';
    reason?: string;
    referenceId?: Schema.Types.ObjectId;
    pendingTransferId?: Schema.Types.ObjectId;
}

const InventoryHistorySchema: Schema = new Schema(
    {
        inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
        sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
        fromAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedDamageTicketByAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        toVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        fromVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        quantity: { type: Number, required: true },
        type: {
            type: String,
            enum: ['transfer_initiated', 'transfer_accepted', 'transfer_rejected', 'deduct_damage', 'deduct_lost', 'vendor_damage', 'vendor_lost', 'deduct_from_order'],
            required: true
        },
        reason: { type: String },
        referenceId: { type: Schema.Types.ObjectId, ref: 'DamageTicket' },
        pendingTransferId: { type: Schema.Types.ObjectId, ref: 'PendingInventoryTransfer' }
    },
    { timestamps: true }
);

export default mongoose.model<IInventoryHistory>('InventoryHistory', InventoryHistorySchema);