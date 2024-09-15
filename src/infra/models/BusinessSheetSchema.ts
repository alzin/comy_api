// src/infrastructure/schemas/BusinessSheetSchema.ts

import mongoose, { Schema, Document } from 'mongoose';
import { BusinessSheet } from '../../domain/entities/BusinessSheet';

export interface BusinessSheetDocument extends Omit<BusinessSheet, 'id'>, Document {}

const BusinessSheetSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    memberProfile: {
      shortBiography: { type: String, max_length: 400 },
    },

    businessInformation: {
      businessDescription: { type: String, max_length: 400 },
    },

    personalInformation: { type: String, max_length: 200 },

    goals: { type: String, max_length: 1000 },

    accomplishments: { type: String, max_length: 1000 },

    interests: { type: String, max_length: 1000 },

    networks: { type: String, max_length: 1000 },

    skills: { type: String, max_length: 1000 },

    goldenFarmer: {
      fields: [{ type: String, max_length: 10 }],
    },

    goldenGoose: {
      fields: [{ type: String, max_length: 40 }],
    },

    companyStrengths: { type: String, max_length: 1000 },

    powerWords: {
      fields: [{ type: String, max_length: 10 }],
    },

    itemsProducts: {
      fields: [{ type: String, max_length: 40 }],
    },

    customization: {
      fontPreference: { type: String },
      colorPreference: { type: String },
    },

    sharingInformation: {
      url: { type: String },
      qrCode: { type: String },
    },
  },
  { timestamps: true }
);

export const BusinessSheetModel = mongoose.model<BusinessSheetDocument>(
  'BusinessSheet',
  BusinessSheetSchema
);
