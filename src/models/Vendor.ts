import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  vendorId?: string; // Optional field to satisfy existing database index
  permanentId: string; // V1234
  name: string;
  phone: string;
  email: string;
  address?: string;
  documents?: string[];
  state?: string;
  city?: string;
  area?: string;
  dob: Date; // Date of birth - mandatory
  active: boolean;
}

const VendorSchema: Schema = new Schema(
  {
    vendorId: { type: String, unique: true, sparse: true },
    permanentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: [String], default: [] },  // pickup location, warehouse address
    documents: [{ type: String }],
    state: { type: String },
    city: { type: String },
    area: { type: String },
    dob: { type: Date, required: true }, // Date of birth - mandatory
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IVendor>('Vendor', VendorSchema);