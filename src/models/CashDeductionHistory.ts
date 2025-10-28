import mongoose, { Schema, Document } from 'mongoose';

export interface ICashDeductionHistory extends Document {
  vendorId: Schema.Types.ObjectId;
  amount: number;
  deductedBy: Schema.Types.ObjectId; // Admin who performed the deduction
  reason?: string;
  referenceId?: string; // Optional reference ID
  createdAt: Date;
}

const CashDeductionHistorySchema: Schema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    amount: { type: Number, required: true },
    deductedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Assuming User model for admin
    reason: { type: String },
    referenceId: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<ICashDeductionHistory>('CashDeductionHistory', CashDeductionHistorySchema);