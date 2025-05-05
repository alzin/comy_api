import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBotMessageModel extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  suggestedUser?: Types.ObjectId;
  suggestionReason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  content?: string;
  createdAt: Date;
  readBy: Types.ObjectId[];
}

const botMessageSchema = new Schema<IBotMessageModel>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  suggestedUser: { type: Schema.Types.ObjectId, ref: 'User' },
  suggestionReason: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

export const BotMessageModel = mongoose.model<IBotMessageModel>('BotMessage', botMessageSchema);