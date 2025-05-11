///src/chat/domain/entities/BotMessage.ts
import mongoose from 'mongoose';

const botMessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  suggestedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  suggestionReason: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

export const BotMessageModel = mongoose.model('BotMessage', botMessageSchema);