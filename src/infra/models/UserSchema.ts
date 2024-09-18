// src/infrastructure/schemas/UserSchema.ts

import mongoose, { Schema, Document, Types } from "mongoose";
import { User } from "../../domain/entities/User";

export interface UserDocument
  extends Omit<User, "id">,
    Document<Types.ObjectId> {
  _id: Types.ObjectId;
}

const UserSchema: Schema<UserDocument> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<UserDocument>("User", UserSchema);
