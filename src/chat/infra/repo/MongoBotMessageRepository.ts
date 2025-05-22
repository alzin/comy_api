import mongoose from 'mongoose';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel, { IBotMessageModel } from '../database/models/models/BotMessageModel';

export class MongoBotMessageRepository implements IBotMessageRepository {
  async create(botMessage: BotMessage): Promise<void> {
    try {
      const messageDoc = new BotMessageModel({
        _id: new mongoose.Types.ObjectId(botMessage.id),
        senderId: botMessage.senderId,
        content: botMessage.content,
        chatId: botMessage.chatId,
        createdAt: botMessage.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: botMessage.readBy,
        recipientId: botMessage.recipientId,
        suggestedUser: botMessage.suggestedUser,
        suggestionReason: botMessage.suggestionReason,
        status: botMessage.status,
        isMatchCard: botMessage.isMatchCard,
        isSuggested: botMessage.isSuggested,
        suggestedUserProfileImageUrl: botMessage.suggestedUserProfileImageUrl,
        suggestedUserName: botMessage.suggestedUserName,
        suggestedUserCategory: botMessage.suggestedUserCategory,
        senderProfileImageUrl: botMessage.senderProfileImageUrl // Add senderProfileImageUrl
      });
      await messageDoc.save();
      console.log(`Created bot message with ID: ${botMessage.id} in chat ${botMessage.chatId}`);
    } catch (error) {
      console.error(`Error creating bot message for chatId: ${botMessage.chatId}`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<BotMessage | null> {
    try {
      const messageDoc = await BotMessageModel.findById(id).exec();
      if (!messageDoc) {
        return null;
      }
      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId.toString(),
        content: messageDoc.content,
        chatId: messageDoc.chatId.toString(),
        createdAt: messageDoc.createdAt,
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: messageDoc.suggestedUser?.toString(),
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl // Add senderProfileImageUrl
      };
    } catch (error) {
      console.error(`Error finding bot message with ID: ${id}`, error);
      throw error;
    }
  }

  async updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      await BotMessageModel.findByIdAndUpdate(id, { status }).exec();
      console.log(`Updated suggestion status for message ${id} to ${status}`);
    } catch (error) {
      console.error(`Error updating suggestion status for message ${id}`, error);
      throw error;
    }
  }
}