// src/application/use-cases/business-sheet/CreateBusinessSheetUseCass.ts
import { BusinessSheet } from "../../../domain/entities/BusinessSheet";
import { IBusinessSheetRepository } from "../../../domain/repo/IBusinessSheetRepository";
import { BusinessSheetImageUploader } from "./BusinessSheetImageUploader";

export class CreateBusinessSheetUseCase {
  constructor(
    private businessSheetRepository: IBusinessSheetRepository,
    private imageUploader: BusinessSheetImageUploader,
  ) {}

  async execute(
    businessSheetData: Omit<BusinessSheet, "id">,
    images: {
      headerBackgroundImage?: Buffer;
      profileImage?: Buffer;
      referralSheetBackgroundImage?: Buffer;
    },
  ): Promise<BusinessSheet & { userName: string; userCategory: string }> {
    const imageUrls = await this.imageUploader.upload({
      ...images,
      userId: businessSheetData.userId,
    });

    const completeBusinessSheetData = { ...businessSheetData, ...imageUrls };

    const businessSheet = await this.businessSheetRepository.create(
      completeBusinessSheetData,
    );

    return businessSheet;
  }
}

