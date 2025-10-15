import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  permanentId: string; // U1234
  name: string;
  email: string;
  phone?: string;
  password?: string;
  address?: string;
  role: 'admin' | 'vendor' | 'user';
  active: boolean;
}

const UserSchema: Schema = new Schema(
  {
    permanentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String },
    address: { type: String },
    role: { type: String, enum: ['admin', 'vendor', 'user'], default: 'user' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
