import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryHistory extends Document {
    inventory: Schema.Types.ObjectId;
    sku: Schema.Types.ObjectId;
    fromAdmin?: Schema.Types.ObjectId;
    toVendor?: Schema.Types.ObjectId;
    fromVendor?: Schema.Types.ObjectId;
    quantity: number;
    type: 'transfer_to_vendor' | 'deduct_damage' | 'deduct_lost' | 'vendor_damage' | 'vendor_lost';
    reason?: string;
    referenceId?: Schema.Types.ObjectId;
}

const InventoryHistorySchema: Schema = new Schema(
    {
        inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
        sku: { type: Schema.Types.ObjectId, ref: 'Sku', required: true },
        fromAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedDamageTicketByAdmin: { type: Schema.Types.ObjectId, ref: 'User' , default: null },
        toVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        fromVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        quantity: { type: Number, required: true },
        type: {
            type: String,
            enum: ['transfer_to_vendor', 'deduct_damage', 'deduct_lost', 'vendor_damage', 'vendor_lost'],
            required: true
        },
        reason: { type: String },
        referenceId: { type: Schema.Types.ObjectId, ref: 'DamageTicket' ,}
    },
    { timestamps: true }
);

export default mongoose.model<IInventoryHistory>('InventoryHistory', InventoryHistorySchema);