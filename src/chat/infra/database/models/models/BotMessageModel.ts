import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserDocument } from '../../../../../infra/database/models/UserModel';

export interface IBotMessageModel extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  senderId: Types.ObjectId | UserDocument;
  content: string;
  chatId: Types.ObjectId;
  createdAt: string;
  readBy: Types.ObjectId[];
  recipientId?: Types.ObjectId;
  suggestedUser?: Types.ObjectId | UserDocument;
  suggestionReason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  senderProfileImageUrl?: string;
}

const botMessageSchema = new Schema<IBotMessageModel>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    createdAt: { type: String, default: () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    suggestedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    suggestionReason: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    isMatchCard: { type: Boolean, default: false, required: true },
    isSuggested: { type: Boolean, default: false, required: true },
    suggestedUserProfileImageUrl: { type: String },
    suggestedUserName: { type: String },
    suggestedUserCategory: { type: String },
    senderProfileImageUrl: { type: String }
  },
  { timestamps: false, collection: 'botmessage' } // Changed from 'botMessages' to 'botmessage'
);

export default mongoose.model<IBotMessageModel>('BotMessage', botMessageSchema);