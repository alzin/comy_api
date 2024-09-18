// src/application/use-cases/EditBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from "../../domain/repo/IBusinessSheetRepository";
import { BusinessSheet } from "../../domain/entities/BusinessSheet";
import { IImageUploadService } from "../../domain/services/IImageUploadService";

export class EditBusinessSheetUseCase {
  constructor(
    private businessSheetRepository: IBusinessSheetRepository,
    private imageUploadService: IImageUploadService,
  ) {}

  async execute(
    userId: string,
    updates: Partial<Omit<BusinessSheet, "id" | "userId">>,
    images: {
      headerBackgroundImage?: Buffer;
      profileImage?: Buffer;
      referralSheetBackgroundImage?: Buffer;
    },
  ): Promise<void> {
    // Fetch the existing business sheet
    const existingBusinessSheet =
      await this.businessSheetRepository.findByUserId(userId);
    if (!existingBusinessSheet) {
      throw new Error("BusinessSheet not found.");
    }

    // Upload new images if provided
    const imageUrls = await this.uploadImages(images, userId);

    // Prepare the updates
    const updateData = {
      ...updates,
      ...imageUrls,
    };

    if (!existingBusinessSheet.id) {
      throw new Error("BusinessSheet ID is missing.");
    }

    // Save the updates
    await this.businessSheetRepository.update(
      existingBusinessSheet.id,
      updateData,
    );
  }

  private async uploadImages(
    images: {
      headerBackgroundImage?: Buffer;
      profileImage?: Buffer;
      referralSheetBackgroundImage?: Buffer;
    },
    userId: string,
  ): Promise<Partial<BusinessSheet>> {
    const imageUrls: Partial<BusinessSheet> = {};

    if (images.headerBackgroundImage) {
      imageUrls.headerBackgroundImageUrl =
        await this.imageUploadService.uploadImage(
          images.headerBackgroundImage,
          `users/${userId}/header-background`,
        );
    }

    if (images.profileImage) {
      imageUrls.profileImageUrl = await this.imageUploadService.uploadImage(
        images.profileImage,
        `users/${userId}/profile`,
      );
    }

    if (images.referralSheetBackgroundImage) {
      imageUrls.referralSheetBackgroundImageUrl =
        await this.imageUploadService.uploadImage(
          images.referralSheetBackgroundImage,
          `users/${userId}/referral-background`,
        );
    }

    return imageUrls;
  }
}
