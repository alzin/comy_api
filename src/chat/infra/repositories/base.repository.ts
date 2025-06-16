// src/shared/infra/repositories/base.repository.ts
import mongoose, { Document, Model, Types } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  protected validateObjectId(id: string, name: string = 'ID'): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${name}: ${id}`);
    }
  }

  protected generateId(asyncVersion: boolean = false): string | Promise<string> {
  const id = new Types.ObjectId().toHexString();
  return asyncVersion ? Promise.resolve(id) : id;
  }

  protected toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  protected async executeQuery<U>(query: Promise<U>): Promise<U> {
    try {
      return await query;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}