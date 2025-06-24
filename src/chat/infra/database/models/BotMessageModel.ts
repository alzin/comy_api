// File: src/chat/infra/database/models/BotMessageModel.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBotMessageModel extends Document<Types.ObjectId> {
  senderName: string;
  relatedUserId: string;
  _id: Types.ObjectId;
  senderId: string;
  content: string; 
  chatId: Types.ObjectId;
  createdAt: string;
  readBy: Types.ObjectId[];
  recipientId?: string;
  suggestedUser?: Types.ObjectId;
  suggestionReason?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  senderProfileImageUrl?: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}

const botMessageSchema = new Schema<IBotMessageModel>(
  {
    senderId: { type: String, required: true },
    content: { type: String }, 
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    createdAt: { type: String,default:()=>new Date().toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})},
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    recipientId: { type: String },
    suggestedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    suggestionReason: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    isMatchCard: { type: Boolean, default: false },
    isSuggested: { type: Boolean, default: false },
    suggestedUserProfileImageUrl: { type: String },
    suggestedUserName: { type: String },
    suggestedUserCategory: { type: String },
    senderProfileImageUrl: { type: String },
    images: [
      {
        imageUrl: { type: String, required: true },
        zoomLink: { type: String, required: true },
      },
    ],
  },
  { timestamps: false, collection: 'botmessages' }
);

botMessageSchema.pre('validate', function (next) {
  if (!this.content && (!this.images || this.images.length === 0)) {
    next(new Error('Either a content or images field must be provided.'));
  } else {
    next();
  }
});

export default mongoose.model<IBotMessageModel>('BotMessage', botMessageSchema);