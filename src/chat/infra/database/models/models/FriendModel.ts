// MongoDB schema for friendships
import mongoose, { Schema, Document } from 'mongoose';

export interface Friend extends Document {
  userId: mongoose.Types.ObjectId; 
  friendId: mongoose.Types.ObjectId; 
  createdAt: Date; 
}

const FriendSchema = new Schema<Friend>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, 
  friendId: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, 
  createdAt: { type: Date, default: Date.now }, 
});

export const FriendModel = mongoose.model<Friend>('Friend', FriendSchema);