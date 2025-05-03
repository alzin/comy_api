import mongoose, { Schema, Document } from 'mongoose';

// Interface for chat model
export interface IChatModel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  isGroupChat: boolean;
  users: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  latestMessage?: mongoose.Types.ObjectId | null;
}

// Chat schema
const ChatSchema: Schema<IChatModel> = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    latestMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null }
  },
  { timestamps: true, collection: 'chats' }
);

export default mongoose.model<IChatModel>('Chat', ChatSchema);