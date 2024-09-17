// src/application/use-cases/CreateBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from "../../domain/repo/IBusinessSheetRepository";
import { BusinessSheet } from "../../domain/entities/BusinessSheet";
import { IImageUploadService } from "../../domain/services/IImageUploadService";

export class CreateBusinessSheetUseCase {
  constructor(
    private businessSheetRepository: IBusinessSheetRepository,
    private imageUploadService: IImageUploadService,
  ) {}

  async execute(
    businessSheetData: Omit<BusinessSheet, "id">,
    images: {
      headerBackgroundImage?: Buffer;
      profileImage?: Buffer;
      referralSheetBackgroundImage?: Buffer;
    },
  ): Promise<BusinessSheet> {
    const imageUrls = await this.uploadImages(images, businessSheetData.userId);

    console.log(businessSheetData);
    const completeBusinessSheetData = { ...businessSheetData, ...imageUrls };

    console.log(completeBusinessSheetData);

    const businessSheet = await this.businessSheetRepository.create(
      completeBusinessSheetData,
    );
    return businessSheet;
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
