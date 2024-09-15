// src/domain/repositories/IBusinessSheetRepository.ts

import { BusinessSheet } from "../entities/BusinessSheet";

export interface IBusinessSheetRepository {
  create(businessSheet: BusinessSheet): Promise<BusinessSheet>;
  findById(id: string): Promise<BusinessSheet | null>;
  findByUserId(userId: string): Promise<BusinessSheet | null>;
  update(businessSheet: BusinessSheet): Promise<void>;
  delete(id: string): Promise<void>;
}
