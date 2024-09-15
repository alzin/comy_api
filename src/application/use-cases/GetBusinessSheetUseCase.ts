// src/application/use-cases/GetBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from '../../domain/repo/IBusinessSheetRepository';
import { BusinessSheet } from '../../domain/entities/BusinessSheet';

export class GetBusinessSheetUseCase {
  constructor(private businessSheetRepository: IBusinessSheetRepository) {}

  async execute(userId: string): Promise<BusinessSheet | null> {
    return await this.businessSheetRepository.findByUserId(userId);
  }
}
