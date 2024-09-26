// src/application/use-cases/GetBusinessSheetUseCase.ts

import { BusinessSheet } from "../../../domain/entities/BusinessSheet";
import { IBusinessSheetRepository } from "../../../domain/repo/IBusinessSheetRepository";

export class GetBusinessSheetUseCase {
  constructor(private businessSheetRepository: IBusinessSheetRepository) {}

  async execute(userId: string): Promise<(BusinessSheet & { userName: string }) | null> {
    return await this.businessSheetRepository.findByUserId(userId);
  }
}
