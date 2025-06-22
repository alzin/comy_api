import mongoose, { Types } from 'mongoose';

export function toObjectId(id: string): Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new Types.ObjectId(id);
}

export function validateObjectId(id: string, field?: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error(`Invalid ${field || 'ObjectId'}: ${id}`);
  }
}

export function formatDate(date?: string): string {
  return date || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}