// src/chat/infra/repo/MongoBotMessageRepository.ts
import mongoose from 'mongoose';
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel from '../database/models/BotMessageModel';
import { UserDocument } from '../../../infra/database/models/UserModel';

export class MongoBotMessageRepository implements IBotMessageRepository {
  createAsync(matchBotMessage: BotMessage): unknown {
    throw new Error('Method not implemented.');
  }
  updateStatus(messageId: string, arg1: string): unknown {
    throw new Error('Method not implemented.');
  }
  async create(botMessage: BotMessage): Promise<BotMessage> {
    try {
      if (!mongoose.Types.ObjectId.isValid(botMessage.senderId)) {
        throw new Error(`Invalid senderId: ${botMessage.senderId}`);
      }
      if (!mongoose.Types.ObjectId.isValid(botMessage.chatId)) {
        throw new Error(`Invalid chatId: ${botMessage.chatId}`);
      }
      if (botMessage.recipientId && !mongoose.Types.ObjectId.isValid(botMessage.recipientId)) {
        throw new Error(`Invalid recipientId: ${botMessage.recipientId}`);
      }
      if (botMessage.suggestedUser && !mongoose.Types.ObjectId.isValid(botMessage.suggestedUser._id)) {
        throw new Error(`Invalid suggestedUser._id: ${botMessage.suggestedUser._id}`);
      }

      const messageDoc = new BotMessageModel({
        _id: botMessage.id ? new mongoose.Types.ObjectId(botMessage.id) : new mongoose.Types.ObjectId(),
        senderId: new mongoose.Types.ObjectId(botMessage.senderId),
        content: botMessage.content,
        chatId: new mongoose.Types.ObjectId(botMessage.chatId),
        createdAt: botMessage.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: botMessage.readBy.map(id => new mongoose.Types.ObjectId(id)),
        recipientId: botMessage.recipientId ? new mongoose.Types.ObjectId(botMessage.recipientId) : undefined,
        suggestedUser: botMessage.suggestedUser ? new mongoose.Types.ObjectId(botMessage.suggestedUser._id) : undefined,
        suggestionReason: botMessage.suggestionReason,
        status: botMessage.status || 'pending',
        isMatchCard: botMessage.isMatchCard || false,
        isSuggested: botMessage.isSuggested || false,
        suggestedUserProfileImageUrl: botMessage.suggestedUserProfileImageUrl,
        suggestedUserName: botMessage.suggestedUserName,
        suggestedUserCategory: botMessage.suggestedUserCategory,
        senderProfileImageUrl: botMessage.senderProfileImageUrl,
        images: botMessage.images || [],
      });

      const savedDoc = await messageDoc.save();
      return {
        id: savedDoc._id.toString(),
        senderId: savedDoc.senderId.toString(),
        content: savedDoc.content || '',
        chatId: savedDoc.chatId.toString(),
        createdAt: savedDoc.createdAt.toString(),
        readBy: savedDoc.readBy.map(id => id.toString()),
        recipientId: savedDoc.recipientId?.toString(),
        suggestedUser: savedDoc.suggestedUser
          ? {
              _id: savedDoc.suggestedUser.toString(),
              name: savedDoc.suggestedUserName || '',
              profileImageUrl: savedDoc.suggestedUserProfileImageUrl || '',
              category: savedDoc.suggestedUserCategory || '',
            }
          : undefined,
        suggestionReason: savedDoc.suggestionReason,
        status: savedDoc.status as 'pending' | 'accepted' | 'rejected',
        isMatchCard: savedDoc.isMatchCard,
        isSuggested: savedDoc.isSuggested,
        suggestedUserProfileImageUrl: savedDoc.suggestedUserProfileImageUrl,
        suggestedUserName: savedDoc.suggestedUserName,
        suggestedUserCategory: savedDoc.suggestedUserCategory,
        senderProfileImageUrl: savedDoc.senderProfileImageUrl,
        relatedUserId: savedDoc.suggestedUser ? savedDoc.suggestedUser.toString() : undefined,
        images: savedDoc.images || [],
      };
    } catch (error) {
      console.error(`Error creating bot message for chatId: ${botMessage.chatId}`, error);
      throw error;
    }
  }

  async findByIdWithSuggestedUser(messageId: string): Promise<BotMessage | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log(`Invalid message ID: ${messageId}`);
        return null;
      }

      const messageDoc = await BotMessageModel.findById(messageId)
        .populate('suggestedUser', '_id name profileImageUrl category')
        .exec();

      if (!messageDoc) {
        return null;
      }

      const suggestedUser = messageDoc.suggestedUser as unknown as UserDocument | undefined;
      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId.toString(),
        content: messageDoc.content || '',
        chatId: messageDoc.chatId.toString(),
        createdAt: messageDoc.createdAt.toString(),
        readBy: messageDoc.readBy.map(id => id.toString()),
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: suggestedUser
          ? {
              _id: suggestedUser._id.toString(),
              name: suggestedUser.name || '',
              profileImageUrl: suggestedUser.profileImageUrl || '',
              category: suggestedUser.category || '',
            }
          : undefined,
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: suggestedUser ? suggestedUser._id.toString() : undefined,
        images: messageDoc.images || [],
      };
    } catch (error) {
      console.error(`Error finding bot message with ID: ${messageId}`, error);
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

      const suggestedUser = messageDoc.suggestedUser as unknown as UserDocument | undefined;
      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId.toString(),
        content: messageDoc.content || '',
        chatId: messageDoc.chatId.toString(),
        createdAt: messageDoc.createdAt.toString(),
        readBy: messageDoc.readBy.map(id => id.toString()),
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: suggestedUser
          ? {
              _id: suggestedUser._id.toString(),
              name: messageDoc.suggestedUserName || '',
              profileImageUrl: messageDoc.suggestedUserProfileImageUrl || '',
              category: messageDoc.suggestedUserCategory || '',
            }
          : undefined,
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: suggestedUser ? suggestedUser._id.toString() : undefined,
        images: messageDoc.images || [],
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

  async updateReadBy(chatId: string, userId: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error(`Invalid chatId: ${chatId}`);
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(`Invalid userId: ${userId}`);
      }

      await BotMessageModel.updateMany(
        { chatId: new mongoose.Types.ObjectId(chatId) },
        { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
      ).exec();
    } catch (error) {
      console.error(`Error updating readBy for chatId: ${chatId}`, error);
      throw error;
    }
  }

  async findExistingSuggestion(
    chatId: string,
    senderId: string,
    recipientId: string,
    suggestedUserId: string
  ): Promise<BotMessage | null> {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(chatId) ||
        !mongoose.Types.ObjectId.isValid(senderId) ||
        !mongoose.Types.ObjectId.isValid(recipientId) ||
        !mongoose.Types.ObjectId.isValid(suggestedUserId)
      ) {
        console.log(
          `Invalid IDs: chatId=${chatId}, senderId=${senderId}, recipientId=${recipientId}, suggestedUserId=${suggestedUserId}`
        );
        return null;
      }

      const messageDoc = await BotMessageModel.findOne({
        chatId: new mongoose.Types.ObjectId(chatId),
        senderId: new mongoose.Types.ObjectId(senderId),
        recipientId: new mongoose.Types.ObjectId(recipientId),
        suggestedUser: new mongoose.Types.ObjectId(suggestedUserId),
        status: 'pending',
      })
        .populate('suggestedUser', '_id name profileImageUrl category')
        .exec();

      if (!messageDoc) {
        return null;
      }

      const suggestedUser = messageDoc.suggestedUser as unknown as UserDocument | undefined;
      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId.toString(),
        content: messageDoc.content || '',
        chatId: messageDoc.chatId.toString(),
        createdAt: messageDoc.createdAt.toString(),
        readBy: messageDoc.readBy.map(id => id.toString()),
        recipientId: messageDoc.recipientId?.toString(),
        suggestedUser: suggestedUser
          ? {
              _id: suggestedUser._id.toString(),
              name: suggestedUser.name || '',
              profileImageUrl: suggestedUser.profileImageUrl || '',
              category: suggestedUser.category || '',
            }
          : undefined,
        suggestionReason: messageDoc.suggestionReason,
        status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: suggestedUser ? suggestedUser._id.toString() : undefined,
        images: messageDoc.images || [],
      };
    } catch (error) {
      console.error(`Error finding existing suggestion for chatId: ${chatId}`, error);
      throw error;
    }
  }
}