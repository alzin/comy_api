import mongoose, { Schema, Document } from 'mongoose';
import { SuggestedPair } from '../../../domain/entities/SuggestedPair';

export interface ISuggestedPairMongoose extends Document, Omit<SuggestedPair, '_id' | 'userId' | 'suggestedUserId'> {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  suggestedUserId: mongoose.Types.ObjectId;
}

const SuggestedPairSchema = new Schema<ISuggestedPairMongoose>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  suggestedUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, enum: ['pending', 'sent'], required: true },
  matchType: { type: String, default: '' },
  similarity: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  matchedTextA: { type: String, default: '' },
  matchedTextB: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) },
});

export const SuggestedPairModel = mongoose.model<ISuggestedPairMongoose>('SuggestedPair', SuggestedPairSchema);