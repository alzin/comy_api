import mongoose, { Types } from 'mongoose';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';

export class MongoBotMessageRepository implements IBotMessageRepository {
  async create(botMessage: BotMessage): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(botMessage.senderId)) {
        throw new Error(`Invalid senderId: ${botMessage.senderId} is not a valid ObjectId`);
      }
      if (!mongoose.Types.ObjectId.isValid(botMessage.chatId)) {
        throw new Error(`Invalid chatId: ${botMessage.chatId} is not a valid ObjectId`);
      }
      if (botMessage.recipientId && !mongoose.Types.ObjectId.isValid(botMessage.recipientId)) {
        throw new Error(`Invalid recipientId: ${botMessage.recipientId} is not a valid ObjectId`);
      }
      if (botMessage.suggestedUser && !mongoose.Types.ObjectId.isValid(botMessage.suggestedUser)) {
        throw new Error(`Invalid suggestedUser: ${botMessage.suggestedUser} is not a valid ObjectId`);
      }

      const messageDoc = new BotMessageModel({
        _id: new mongoose.Types.ObjectId(botMessage.id),
        senderId: botMessage.senderId,
        content: botMessage.content,
        chatId: botMessage.chatId,
        createdAt: botMessage.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: botMessage.readBy.map(id => new mongoose.Types.ObjectId(id)),
        recipientId: botMessage.recipientId ? new mongoose.Types.ObjectId(botMessage.recipientId) : undefined,
        suggestedUser: botMessage.suggestedUser ? new mongoose.Types.ObjectId(botMessage.suggestedUser) : undefined,
        suggestionReason: botMessage.suggestionReason,
        status: botMessage.status || 'pending',
        isMatchCard: botMessage.isMatchCard || false,
        isSuggested: botMessage.isSuggested || false,
        suggestedUserProfileImageUrl: botMessage.suggestedUserProfileImageUrl,
        suggestedUserName: botMessage.suggestedUserName,
        suggestedUserCategory: botMessage.suggestedUserCategory,
        senderProfileImageUrl: botMessage.senderProfileImageUrl
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
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log(`Invalid message ID: ${id}`);
        return null;
      }

      const messageDoc = await BotMessageModel.findById(id)
        .populate('suggestedUser', '_id')
        .exec();
      if (!messageDoc) {
        return null;
      }

      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId?.toString() || '',
        content: messageDoc.content || '',
        chatId: messageDoc.chatId?.toString() || '',
        createdAt: messageDoc.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: messageDoc.readBy?.map((id: mongoose.Types.ObjectId) => id.toString()) || [],
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: messageDoc.suggestedUser ? (messageDoc.suggestedUser as any)._id.toString() : undefined,
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected' || 'pending',
        isMatchCard: messageDoc.isMatchCard || false,
        isSuggested: messageDoc.isSuggested || false,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: (messageDoc.isSuggested || messageDoc.isMatchCard) && messageDoc.suggestedUser
          ? (messageDoc.suggestedUser as any)._id.toString()
          : undefined
      };
    } catch (error) {
      console.error(`Error finding bot message with ID: ${id}`, error);
      throw error;
    }
  }

  async updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid message ID: ${id}`);
      }

      const result = await BotMessageModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
      if (!result) {
        throw new Error(`Bot message with ID ${id} not found`);
      }
      console.log(`Updated suggestion status for message ${id} to ${status}`);
    } catch (error) {
      console.error(`Error updating suggestion status for message ${id}`, error);
      throw error;
    }
  }

  async findExistingSuggestion(chatId: string, senderId: string, recipientId: string, suggestedUserId: string): Promise<BotMessage | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(senderId) ||
          !mongoose.Types.ObjectId.isValid(recipientId) || !mongoose.Types.ObjectId.isValid(suggestedUserId)) {
        console.log(`Invalid IDs for finding existing suggestion: chatId=${chatId}, senderId=${senderId}, recipientId=${recipientId}, suggestedUserId=${suggestedUserId}`);
        return null;
      }

      const messageDoc = await BotMessageModel.findOne({
        chatId: chatId,
        senderId: senderId,
        recipientId: recipientId,
        suggestedUser: suggestedUserId,
        status: 'pending'
      }).exec();

      if (!messageDoc) {
        return null;
      }

      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId?.toString() || '',
        content: messageDoc.content || '',
        chatId: messageDoc.chatId?.toString() || '',
        createdAt: messageDoc.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: messageDoc.readBy?.map((id: mongoose.Types.ObjectId) => id.toString()) || [],
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: messageDoc.suggestedUser?.toString(),
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected' || 'pending',
        isMatchCard: messageDoc.isMatchCard || false,
        isSuggested: messageDoc.isSuggested || false,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl
      };
    } catch (error) {
      console.error(`Error finding existing suggestion for chatId: ${chatId}`, error);
      throw error;
    }
  }
}