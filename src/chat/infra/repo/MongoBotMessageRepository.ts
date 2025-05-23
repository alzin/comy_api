import mongoose, { Types } from 'mongoose';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel, { IBotMessageModel } from '../database/models/models/BotMessageModel';

export class MongoBotMessageRepository implements IBotMessageRepository {
  findByUserAndStatus(userId: string, statuses: string[]): Promise<BotMessage | null> {
    throw new Error('Method not implemented.');
  }
  findByChatId(chatId: string): Promise<BotMessage[]> {
    throw new Error('Method not implemented.');
  }
  async create(message: BotMessage): Promise<void> {
    try {
      const messageDoc = new BotMessageModel({
        _id: new mongoose.Types.ObjectId(message.id),
        senderId: message.senderId,
        content: message.content,
        chatId: message.chatId,
        createdAt: message.createdAt,
        readBy: message.readBy,
        recipientId: message.recipientId,
        suggestedUser: message.suggestedUser,
        suggestionReason: message.suggestionReason,
        isMatchCard: message.isMatchCard || false,
        isSuggested: message.isSuggested || false,
        suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl,
        suggestedUserName: message.isMatchCard ? message.suggestedUserName : undefined,
        suggestedUserCategory: message.isMatchCard ? message.suggestedUserCategory : undefined,
        status: message.status || 'pending' // Always set a valid status
      });
      await messageDoc.save();
      console.log(`Created bot message with ID: ${message.id} in chat ${message.chatId}, isMatchCard: ${message.isMatchCard}, isSuggested: ${message.isSuggested}, status: ${messageDoc.status}`);
    } catch (error) {
      console.error(`Error creating bot message for chatId: ${message.chatId}`, error);
      throw error;
    }
  }

  async updateSuggestionStatus(messageId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await BotMessageModel.findByIdAndUpdate(
      messageId,
      { status },
      { new: true }
    ).exec();
  }
}