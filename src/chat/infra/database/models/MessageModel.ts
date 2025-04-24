import mongoose, { Schema, Document } from 'mongoose';
import { Message } from '../../../domain/entities/Message';

export interface IMessageModel extends Omit<Message, 'id' | 'sender' | 'chat' | 'readBy'>, Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
}

const MessageSchema: Schema<IMessageModel> = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IMessageModel>('Message', MessageSchema);