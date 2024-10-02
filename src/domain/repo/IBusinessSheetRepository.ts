// src/domain/repositories/IBusinessSheetRepository.ts

import { BusinessSheet } from "../entities/BusinessSheet";

export interface IBusinessSheetRepository {
  create(
    businessSheet: Omit<BusinessSheet, "id">,
  ): Promise<BusinessSheet & { userName: string, userCategory: string }>;
  findById(id: string): Promise<BusinessSheet | null>;
  findByUserId(
    userId: string,
  ): Promise<(BusinessSheet & { userName: string, userCategory: string }) | null>;
  update(id: string, updates: Partial<BusinessSheet>): Promise<void>;
  delete(id: string): Promise<void>;
}
