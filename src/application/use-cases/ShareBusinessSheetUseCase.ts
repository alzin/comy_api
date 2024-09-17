// src/application/use-cases/ShareBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from "../../domain/repo/IBusinessSheetRepository";
import { CONFIG } from "../../main/config/config";

export class ShareBusinessSheetUseCase {
  constructor(private businessSheetRepository: IBusinessSheetRepository) {}

  async execute(
    businessSheetId: string,
  ): Promise<{ url: string; qrCode: string }> {
    const businessSheet =
      await this.businessSheetRepository.findById(businessSheetId);
    if (!businessSheet) {
      throw new Error("BusinessSheet not found.");
    }

    // Generate sharing information (e.g., URL and QR code)
    const url = `${CONFIG.ORIGIN_URL}/business-sheets/${businessSheetId}`;
    const qrCode = this.generateQRCode(url);

    // Update the business sheet with sharing information
    businessSheet.sharingInformation = { url, qrCode };
    await this.businessSheetRepository.update(businessSheet);

    return businessSheet.sharingInformation;
  }

  private generateQRCode(url: string): string {
    // Implement QR code generation logic
    // This could involve calling an external service or library
    return "generated-qr-code-data";
  }
}
