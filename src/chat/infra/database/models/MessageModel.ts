import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserDocument } from '../../../../infra/database/models/UserModel';

export interface IMessageModel extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  sender: Types.ObjectId | UserDocument;
  content: string;
  chat: Types.ObjectId;
  createdAt: string;
  readBy: Types.ObjectId[];
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  senderProfileImageUrl?: string; // Added this field
}

const messageSchema = new Schema<IMessageModel>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isMatchCard: { type: Boolean, default: false, required: true },
    isSuggested: { type: Boolean, default: false, required: true },
    suggestedUserProfileImageUrl: { type: String },
    suggestedUserName: { type: String },
    suggestedUserCategory: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    senderProfileImageUrl: { type: String }, 
    createdAt: { type: String, default: () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) }
  },
  { timestamps: false, collection: 'messages' }
);

export default mongoose.model<IMessageModel>('Message', messageSchema);