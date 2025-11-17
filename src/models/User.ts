import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  permanentId: string; // U1234
  name: string;
  email: string;
  phone: string;
  password?: string;
  address?: string;
  dob: Date;
  role: 'admin' | 'vendor' | 'user';
  active: boolean;
  temporaryUser: boolean; // Add this line
  pincode?: string | null;
  location?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const UserSchema: Schema = new Schema(
  {
    permanentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, default: null },  // fron frontend side validation will go - required: true
    phone: { type: String, required: true },
    temporaryUser: { type: Boolean, default: false },
    password: { type: String, default: null },
    address: { type: [String], default: [] },
    dob: { type: Date, required: true, default: null },
    role: { type: String, enum: ['admin', 'vendor', 'user'], default: 'user' },
    active: { type: Boolean, default: true },
    pincode: { type: String, default: null },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  { timestamps: true }
);

// Create a 2dsphere index on the location field
UserSchema.index({ location: '2dsphere' });

export default mongoose.model<IUser>('User', UserSchema);