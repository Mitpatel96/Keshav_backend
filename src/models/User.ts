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
}

const UserSchema: Schema = new Schema(
  {
    permanentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true },  // fron frontend side validation will go - required: true
    phone: { type: String, required: true },
    temporaryUser: { type: Boolean, default: false },
    password: { type: String },
    address: { type: String },
    dob: { type: Date, required: true },
    role: { type: String, enum: ['admin', 'vendor', 'user'], default: 'user' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);