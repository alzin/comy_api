///src/chat/infra/database/models/MessageModel.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessageModel extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  senderId: string;
  senderName: string;
  content: string;
  chat: Types.ObjectId;
  createdAt: string;
  readBy: Types.ObjectId[];
  isMatchCard: boolean;
  isSuggested: boolean;
  senderProfileImageUrl?: string;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  relatedUserId?: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}

const messageSchema = new Schema<IMessageModel>(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    createdAt: { type: String,default:()=>new Date().toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})},
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isMatchCard: { type: Boolean, default: false },
    isSuggested: { type: Boolean, default: false },
    senderProfileImageUrl: { type: String },
    suggestedUserProfileImageUrl: { type: String },
    suggestedUserName: { type: String },
    suggestedUserCategory: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    relatedUserId: { type: String },
    images: [
      {
        imageUrl: { type: String, required: true },
        zoomLink: { type: String, required: true }
      }
    ]
  },
  { timestamps: false, collection: 'messages' }
);

export default mongoose.model<IMessageModel>('Message', messageSchema);