import mongoose, { Schema, Document } from "mongoose";
import { BusinessSheet } from "../../../domain/entities/BusinessSheet";

export interface BusinessSheetDocument
  extends Omit<BusinessSheet, "id">,
    Document {}

const BusinessSheetSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shortBiography: { type: String, max_length: 400 },
    businessDescription: { type: String, max_length: 400 },
    personalInformation: { type: String, max_length: 200 },
    goals: { type: String, max_length: 1000 },
    accomplishments: { type: String, max_length: 1000 },
    interests: { type: String, max_length: 1000 },
    networks: { type: String, max_length: 1000 },
    skills: { type: String, max_length: 1000 },
    goldenEgg: [{ type: String, max_length: 10 }],
    goldenGoose: [{ type: String, max_length: 40 }],
    goldenFarmer: [{ type: String, max_length: 10 }],
    companyStrengths: { type: String, max_length: 1000 },
    powerWords: [{ type: String, max_length: 10 }],
    itemsProducts: [{ type: String, max_length: 40 }],
    fontPreference: { type: String },
    colorPreference: { type: String },
    sharingUrl: { type: String },
    sharingQrCode: { type: String },
    headerBackgroundImageUrl: { type: String },
    profileImageUrl: { type: String },
    referralSheetBackgroundImageUrl: { type: String },
  },
  { timestamps: true },
);

export const BusinessSheetModel = mongoose.model<BusinessSheetDocument>(
  "BusinessSheet",
  BusinessSheetSchema,
);
