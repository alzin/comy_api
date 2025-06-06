// File: src/chat/infra/database/models/SuggestedPairModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISuggestedPair extends Document {
  userId: mongoose.Types.ObjectId;
  suggestedUserId: mongoose.Types.ObjectId;
  status: 'pending' | 'sent' | 'rejected' | 'matched';
  matchType: string;
  similarity: number;
  reason: string;
  matchedTextA: string;
  matchedTextB: string;
  createdAt: string;
}

const SuggestedPairSchema = new Schema<ISuggestedPair>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  suggestedUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, enum: ['pending', 'sent', 'rejected', 'matched'], required: true },
  matchType: { type: String, default: '' },
  similarity: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  matchedTextA: { type: String, default: '' },
  matchedTextB: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) },
});

export const SuggestedPairModel = mongoose.model<ISuggestedPair>('SuggestedPair', SuggestedPairSchema);