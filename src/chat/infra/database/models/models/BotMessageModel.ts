import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserDocument } from '../../../../../infra/database/models/UserModel';

export interface IBotMessageModel extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  chatId: Types.ObjectId;
  createdAt: Date;
  readBy: Types.ObjectId[];
  recipientId?: string;
  suggestedUser?: Types.ObjectId | UserDocument;
  suggestionReason?: string;
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

const botMessageSchema = new Schema<IBotMessageModel>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    recipientId: { type: String },
    suggestedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    suggestionReason: { type: String },
    isMatchCard: { type: Boolean, default: false, required: true },
    isSuggested: { type: Boolean, default: false, required: true },
    suggestedUserProfileImageUrl: { type: String },
    suggestedUserName: { type: String },
    suggestedUserCategory: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] }
  },
  { timestamps: true, collection: 'botmessages' }
);

export default mongoose.model<IBotMessageModel>('BotMessage', botMessageSchema);