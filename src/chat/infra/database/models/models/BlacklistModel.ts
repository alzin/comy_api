////src/chat/infra/database/models/models/BlacklistModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklistModel extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  blockedUserId: string;
  blockDuration: number;
  createdAt: string;
}

const blacklistSchema = new Schema<IBlacklistModel>({
  userId: { type: String, required: true },
  blockedUserId: { type: String, required: true },
  blockDuration: { type: Number, default: 7 },
  createdAt: { type: String, default: () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) } 
});

export const BlacklistModel = mongoose.model<IBlacklistModel>('Blacklist', blacklistSchema);