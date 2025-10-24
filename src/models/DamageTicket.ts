import mongoose, { Schema, Document } from 'mongoose';

export interface IDamageTicket extends Document {
  inventory: Schema.Types.ObjectId;
  vendor: Schema.Types.ObjectId;
  sku: Schema.Types.ObjectId;
  quantity: number;
  type: 'damage' | 'lost';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
}

const DamageTicketSchema: Schema = new Schema(
  {
    inventory: { type: Schema.Types.ObjectId, ref: 'Inventory' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    approvedByAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sku: { type: Schema.Types.ObjectId, ref: 'Sku' },
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['damage', 'lost'], required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);

export default mongoose.model<IDamageTicket>('DamageTicket', DamageTicketSchema);

