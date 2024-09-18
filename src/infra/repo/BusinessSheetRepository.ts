// src/infrastructure/repositories/BusinessSheetRepository.ts

import { IBusinessSheetRepository } from "../../domain/repo/IBusinessSheetRepository";
import { BusinessSheet } from "../../domain/entities/BusinessSheet";
import { BusinessSheetModel } from "../models/BusinessSheetSchema";

export class BusinessSheetRepository implements IBusinessSheetRepository {
  async create(
    businessSheet: Omit<BusinessSheet, "id">,
  ): Promise<BusinessSheet> {
    const newBusinessSheet = new BusinessSheetModel(businessSheet);
    const savedBusinessSheet = await newBusinessSheet.save();
    return this.mapToDomain(savedBusinessSheet);
  }

  async findById(id: string): Promise<BusinessSheet | null> {
    const bsDoc = await BusinessSheetModel.findById(id).exec();
    return bsDoc ? this.mapToDomain(bsDoc) : null;
  }

  async findByUserId(userId: string): Promise<BusinessSheet | null> {
    const bsDoc = await BusinessSheetModel.findOne({ userId }).exec();
    return bsDoc ? this.mapToDomain(bsDoc) : null;
  }

  async update(id: string, updates: Partial<BusinessSheet>): Promise<void> {
    await BusinessSheetModel.updateOne(
      { _id: id },
      { $set: updates },
      { runValidators: true },
    ).exec();
  }

  async delete(id: string): Promise<void> {
    await BusinessSheetModel.findByIdAndDelete(id).exec();
  }

  private mapToDomain(bsDoc: any): BusinessSheet {
    return {
      id: bsDoc._id.toString(),
      userId: bsDoc.userId.toString(),
      shortBiography: bsDoc.shortBiography,
      businessDescription: bsDoc.businessDescription,
      personalInformation: bsDoc.personalInformation,
      goals: bsDoc.goals,
      accomplishments: bsDoc.accomplishments,
      interests: bsDoc.interests,
      networks: bsDoc.networks,
      skills: bsDoc.skills,
      goldenEgg: bsDoc.goldenEgg,
      goldenFarmer: bsDoc.goldenFarmer,
      goldenGoose: bsDoc.goldenGoose,
      companyStrengths: bsDoc.companyStrengths,
      powerWords: bsDoc.powerWords,
      itemsProducts: bsDoc.itemsProducts,
      fontPreference: bsDoc.fontPreference,
      colorPreference: bsDoc.colorPreference,
      sharingUrl: bsDoc.sharingUrl,
      sharingQrCode: bsDoc.sharingQrCode,
      headerBackgroundImageUrl: bsDoc.headerBackgroundImageUrl,
      profileImageUrl: bsDoc.profileImageUrl,
      referralSheetBackgroundImageUrl: bsDoc.referralSheetBackgroundImageUrl,
    };
  }
}
