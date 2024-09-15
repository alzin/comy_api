// src/application/use-cases/CreateBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from '../../domain/repo/IBusinessSheetRepository';
import { BusinessSheet } from '../../domain/entities/BusinessSheet';

export class CreateBusinessSheetUseCase {
  constructor(private businessSheetRepository: IBusinessSheetRepository) {}

  async execute(businessSheetData: Omit<BusinessSheet, 'id'>): Promise<BusinessSheet> {
    const businessSheet = await this.businessSheetRepository.create(businessSheetData);
    return businessSheet;
  }
}
