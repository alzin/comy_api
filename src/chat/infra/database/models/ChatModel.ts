// src/chat/infra/database/models/ChatModel.ts
import mongoose, { Schema, Document } from 'mongoose';
import { Chat } from '../../../domain/entities/Chat';

export interface IChatModel extends Omit<Chat, 'id' | 'users' | 'latestMessage'>, Document {
  _id: mongoose.Types.ObjectId;
  users: mongoose.Types.ObjectId[];
  latestMessage?: mongoose.Types.ObjectId | null;
}

const ChatSchema: Schema<IChatModel> = new Schema(
  {
    name: { type: String, required: false },
    isGroupChat: { type: Boolean, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    latestMessage: { type: Schema.Types.ObjectId, ref: 'Message', required: false },
  },
  { timestamps: true }
);

export default mongoose.model<IChatModel>('Chat', ChatSchema);