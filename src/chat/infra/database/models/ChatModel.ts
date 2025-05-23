import mongoose, { Schema, Document, Types } from 'mongoose';

  export interface IChatModel extends Document<Types.ObjectId> {
    _id: Types.ObjectId;
    name: string;
    isGroupChat: boolean;
    users: Types.ObjectId[];
    profileImageUrl: string;
    botProfileImageUrl?: string;
    createdAt: string; 
    updatedAt: string; 
    latestMessage?: Types.ObjectId | null;
  }

  const ChatSchema: Schema<IChatModel> = new Schema(
    {
      name: { type: String, required: true },
      isGroupChat: { type: Boolean, required: true },
      users: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      profileImageUrl: { type: String, default: '' },
      botProfileImageUrl: { type: String },
      latestMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
      createdAt: { type: String, default: () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) }, // JST
      updatedAt: { type: String, default: () => new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) }  // JST
    },
    { timestamps: false } 
  );

  export const ChatModel = mongoose.model<IChatModel>('Chat', ChatSchema);