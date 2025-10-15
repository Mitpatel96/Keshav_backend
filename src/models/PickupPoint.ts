import mongoose, { Schema, Document } from 'mongoose';

export interface IPickupPoint extends Document {
  name: string;
  address: string;
  state?: string;
  city?: string;
  area?: string;
  vendors: Schema.Types.ObjectId[];
}

const PickupPointSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    state: { type: String },
    city: { type: String },
    area: { type: String },
    vendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }]
  },
  { timestamps: true }
);

export default mongoose.model<IPickupPoint>('PickupPoint', PickupPointSchema);

