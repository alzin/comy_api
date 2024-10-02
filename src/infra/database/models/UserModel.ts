// src/infrastructure/database/models/UserModel.ts

import mongoose, { Schema, Document, Types } from "mongoose";
import { User } from "../../../domain/entities/User";
import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";

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
    profileImageUrl: { type: String },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    stripeCustomerId: { type: String, unique: true, sparse: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    subscriptionStatus: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.Incomplete,
    },
    currentPeriodEnd: { type: Date },
    subscriptionPlan: { type: String },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<UserDocument>("User", UserSchema);
