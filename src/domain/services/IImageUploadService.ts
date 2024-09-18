// src/domain/services/IImageUploadService.ts

export interface IImageUploadService {
  uploadImage(imageBuffer: Buffer, key: string): Promise<string>;
  deleteImage(key: string): Promise<void>;
}
