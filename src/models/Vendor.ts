import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  permanentId: string; // V1234
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  documents?: string[];
  state?: string;
  city?: string;
  area?: string;
  active: boolean;
}

const VendorSchema: Schema = new Schema(
  {
    permanentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    documents: [{ type: String }],
    state: { type: String },
    city: { type: String },
    area: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IVendor>('Vendor', VendorSchema);

