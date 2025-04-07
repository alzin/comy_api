// src/application/use-cases/EditBusinessSheetUseCase.ts

import { BusinessSheet } from "../../../domain/entities/BusinessSheet";
import { IBusinessSheetRepository } from "../../../domain/repo/IBusinessSheetRepository";
import { BusinessSheetImageUploader } from "./BusinessSheetImageUploader";

export class EditBusinessSheetUseCase {
  constructor(
    private businessSheetRepository: IBusinessSheetRepository,
    private imageUploader: BusinessSheetImageUploader,
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
    const existingBusinessSheet =
      await this.businessSheetRepository.findByUserId(userId);
    if (!existingBusinessSheet) {
      throw new Error("BusinessSheet not found.");
    }

    const imageUrls = await this.imageUploader.upload({
      ...images,
      userId,
    });

    const updateData = {
      ...updates,
      ...imageUrls,
    };

    if (!existingBusinessSheet.id) {
      throw new Error("BusinessSheet ID is missing.");
    }

    await this.businessSheetRepository.update(
      existingBusinessSheet.id,
      updateData,
    );
  }
}
