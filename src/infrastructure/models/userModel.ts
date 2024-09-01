import mongoose, { Schema, Document } from 'mongoose';

interface IUserDocument extends Document {
  email: string;
  name: string;
  password: string;
  isVerified: boolean;
  verificationToken: string | null;
}

const UserSchema = new Schema<IUserDocument>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
}, { _id: true }); // This ensures that MongoDB will auto-generate _id if not provided

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);