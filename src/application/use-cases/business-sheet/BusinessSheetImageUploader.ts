// src/application/use-cases/business-sheet/BusinessSheetImageUploader.ts

import { IImageUploadService } from "../../../domain/services/IImageUploadService";
import { BusinessSheet } from "../../../domain/entities/BusinessSheet";

interface UploadImagesParams {
  headerBackgroundImage?: Buffer;
  profileImage?: Buffer;
  referralSheetBackgroundImage?: Buffer;
  userId: string;
}

export class BusinessSheetImageUploader {
  constructor(private imageUploadService: IImageUploadService) {}

  async upload({
    headerBackgroundImage,
    profileImage,
    referralSheetBackgroundImage,
    userId,
  }: UploadImagesParams): Promise<Partial<BusinessSheet>> {
    const imageUrls: Partial<BusinessSheet> = {};

    if (headerBackgroundImage) {
      imageUrls.headerBackgroundImageUrl =
        await this.imageUploadService.uploadImage(
          headerBackgroundImage,
          `users/${userId}/header-background`,
        );
    }

    if (profileImage) {
      imageUrls.profileImageUrl = await this.imageUploadService.uploadImage(
        profileImage,
        `users/${userId}/profile`,
      );
    }

    if (referralSheetBackgroundImage) {
      imageUrls.referralSheetBackgroundImageUrl =
        await this.imageUploadService.uploadImage(
          referralSheetBackgroundImage,
          `users/${userId}/referral-background`,
        );
    }

    return imageUrls;
  }
}
