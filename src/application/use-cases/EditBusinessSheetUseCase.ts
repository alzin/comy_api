// src/application/use-cases/EditBusinessSheetUseCase.ts

import { IBusinessSheetRepository } from '../../domain/repo/IBusinessSheetRepository';
import { BusinessSheet } from '../../domain/entities/BusinessSheet';

export class EditBusinessSheetUseCase {
  constructor(private businessSheetRepository: IBusinessSheetRepository) {}

  async execute(userId: string, updates: Partial<Omit<BusinessSheet, 'id' | 'userId'>>): Promise<void> {
    // Fetch the existing business sheet
    const existingBusinessSheet = await this.businessSheetRepository.findByUserId(userId);
    if (!existingBusinessSheet) {
      throw new Error('BusinessSheet not found.');
    }

    // Merge updates
    const updatedBusinessSheet = { ...existingBusinessSheet, ...updates };

    // Save the updates
    await this.businessSheetRepository.update(updatedBusinessSheet);
  }
}
