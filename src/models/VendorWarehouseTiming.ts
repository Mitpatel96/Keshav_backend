import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVendorWarehouseTiming extends Document {
  vendor: Types.ObjectId;
  weekStartDate: Date; // Monday of the week
  weekEndDate: Date; // Sunday of the week
  timings: Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string; // Format: "HH:mm" (e.g., "09:00")
    endTime: string; // Format: "HH:mm" (e.g., "18:00")
    isOpen: boolean; // Whether warehouse is open on this day
  }>;
  isLocked: boolean; // If true, vendor cannot update this week's timings (missed deadline)
  createdAt: Date;
  updatedAt: Date;
}

const VendorWarehouseTimingSchema: Schema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    weekStartDate: { type: Date, required: true }, // Monday
    weekEndDate: { type: Date, required: true }, // Sunday
    timings: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          required: true
        },
        startTime: { type: String, required: true }, // Format: "HH:mm"
        endTime: { type: String, required: true }, // Format: "HH:mm"
        isOpen: { type: Boolean, default: true }
      }
    ],
    isLocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for efficient queries
VendorWarehouseTimingSchema.index({ vendor: 1, weekStartDate: 1 }, { unique: true });
VendorWarehouseTimingSchema.index({ weekStartDate: 1 });

export default mongoose.model<IVendorWarehouseTiming>('VendorWarehouseTiming', VendorWarehouseTimingSchema);

