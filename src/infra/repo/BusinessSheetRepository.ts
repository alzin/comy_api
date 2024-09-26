// src/infrastructure/repositories/BusinessSheetRepository.ts

import { IBusinessSheetRepository } from "../../domain/repo/IBusinessSheetRepository";
import { BusinessSheet } from "../../domain/entities/BusinessSheet";
import { BusinessSheetModel } from "../database/models/BusinessSheetModel";
import { UserModel } from "../database/models/UserModel";

export class BusinessSheetRepository implements IBusinessSheetRepository {
  async create(
    businessSheet: Omit<BusinessSheet, "id">,
  ): Promise<BusinessSheet & { userName: string }> {
    const newBusinessSheet = new BusinessSheetModel(businessSheet);
    const savedBusinessSheet = await newBusinessSheet.save();

    const user = await this.findUserById(savedBusinessSheet.userId);

    // Call helper function to update profileImageUrl in User
    await this.updateUserProfileImageUrl(
      savedBusinessSheet.userId,
      savedBusinessSheet.profileImageUrl,
    );

    return { ...this.mapToDomain(savedBusinessSheet), userName: user.name };
  }

  async findById(id: string): Promise<BusinessSheet | null> {
    const bsDoc = await BusinessSheetModel.findById(id).exec();
    return bsDoc ? this.mapToDomain(bsDoc) : null;
  }

  async findByUserId(userId: string): Promise<(BusinessSheet & { userName: string }) | null> {
    const bsDoc = await BusinessSheetModel.findOne({ userId }).exec();
    if (!bsDoc) return null;

    const user = await this.findUserById(userId);

    return { ...this.mapToDomain(bsDoc), userName: user.name };
  }

  async update(id: string, updates: Partial<BusinessSheet>): Promise<void> {
    const updatedBusinessSheet = await BusinessSheetModel.findByIdAndUpdate(
      { _id: id },
      { $set: updates },
      { new: true, runValidators: true },
    ).exec();

    // If the update contains profileImageUrl, sync it with the User model
    if (updatedBusinessSheet && updates.profileImageUrl) {
      await this.updateUserProfileImageUrl(
        updatedBusinessSheet.userId,
        updates.profileImageUrl,
      );
    }
  }

  async delete(id: string): Promise<void> {
    await BusinessSheetModel.findByIdAndDelete(id).exec();
  }

  private async findUserById(userId: string) {
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      throw new Error(`User not found for ID: ${userId}`);
    }
    return user;
  }

  // Helper function to update the user's profileImageUrl
  private async updateUserProfileImageUrl(
    userId: string,
    profileImageUrl?: string,
  ): Promise<void> {
    if (profileImageUrl) {
      await UserModel.updateOne(
        { _id: userId },
        { $set: { profileImageUrl } },
      ).exec();
    }
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
