import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, required: false},
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1 });

const Category = mongoose.model<ICategory>('Category', CategorySchema);

export default Category;