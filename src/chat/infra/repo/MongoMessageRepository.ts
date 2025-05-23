import mongoose, { Types } from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/models/BotMessageModel';
import { ChatModel } from '../database/models/ChatModel';
import { UserModel, UserDocument } from '../../../infra/database/models/UserModel';

export class MongoMessageRepository implements IMessageRepository {
  async create(message: Message): Promise<Message> {
    try {
      const messageDoc = new MessageModel({
        _id: new mongoose.Types.ObjectId(message.id),
        sender: message.sender,
        content: message.content,
        chat: message.chatId,
        createdAt: message.createdAt,
        readBy: message.readBy,
        isMatchCard: message.isMatchCard || false,
        isSuggested: message.isSuggested || false,
        suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl,
        suggestedUserName: message.isMatchCard ? message.suggestedUserName : undefined,
        suggestedUserCategory: message.isMatchCard ? message.suggestedUserCategory : undefined,
        status: message.isMatchCard ? (message.status || 'pending') : undefined
      });
      await messageDoc.save();
      console.log(`Created message with ID: ${message.id} in chat ${message.chatId}, isMatchCard: ${message.isMatchCard}, isSuggested: ${message.isSuggested}, status: ${message.status}`);

      return {
        id: messageDoc._id.toString(),
        sender: message.sender,
        content: messageDoc.content || '',
        chatId: messageDoc.chat.toString(),
        createdAt: messageDoc.createdAt || new Date(),
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        status: messageDoc.status
      };
    } catch (error) {
      console.error(`Error creating message for chatId: ${message.chatId}`, error);
      throw error;
    }
  }

  private mapToDomain(messageDoc: IMessageModel | IBotMessageModel): Message {
    if (!messageDoc) {
      throw new Error('Message document is null');
    }

    const isBotMessage = 'senderId' in messageDoc;
    const senderField = isBotMessage ? messageDoc.senderId : messageDoc.sender;
    const sender = senderField && typeof senderField === 'object' && 'name' in senderField
      ? (senderField as unknown as UserDocument).name
      : 'COMY オフィシャル AI';

    const baseMessage: Message = {
      id: messageDoc._id.toString(),
      sender,
      content: messageDoc.content || '',
      chatId: ('chat' in messageDoc ? messageDoc.chat : messageDoc.chatId)?.toString() || '',
      readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdAt: messageDoc.createdAt || new Date(),
      isMatchCard: isBotMessage ? (messageDoc as IBotMessageModel).isMatchCard : messageDoc.isMatchCard,
      isSuggested: isBotMessage ? (messageDoc as IBotMessageModel).isSuggested : messageDoc.isSuggested,
      suggestedUserProfileImageUrl: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserProfileImageUrl
        : messageDoc.suggestedUserProfileImageUrl,
      suggestedUserName: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserName
        : messageDoc.isMatchCard
        ? messageDoc.suggestedUserName
        : undefined,
      suggestedUserCategory: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserCategory
        : messageDoc.isMatchCard
        ? messageDoc.suggestedUserCategory
        : undefined,
      status: (isBotMessage && (messageDoc as IBotMessageModel).isMatchCard) || (!isBotMessage && messageDoc.isMatchCard)
        ? (isBotMessage ? (messageDoc as IBotMessageModel).status : messageDoc.status) || 'pending'
        : undefined
    };

    if ('suggestedUser' in messageDoc && messageDoc.suggestedUser && baseMessage.isMatchCard) {
      const suggestedUser = messageDoc.suggestedUser as unknown as UserDocument;
      return {
        ...baseMessage,
        suggestedUserProfileImageUrl: baseMessage.suggestedUserProfileImageUrl || suggestedUser.profileImageUrl || undefined,
        suggestedUserName: baseMessage.suggestedUserName || suggestedUser.name || 'User',
        suggestedUserCategory: baseMessage.suggestedUserCategory || suggestedUser.category || 'unknown'
      };
    }

    return baseMessage;
  }

  private async isBotChat(chatId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return false;
    }
    const chat = await ChatModel.findById(chatId).exec();
    if (!chat || chat.isGroupChat) {
      return false;
    }
    const virtualUserId = process.env.VIRTUAL_USER_ID || '681547798892749fbe910c02';
    return chat.users.some((userId: mongoose.Types.ObjectId) => userId.toString() === virtualUserId);
  }

  async findByChatId(chatId: string, page: number = 1, limit: number = 20): Promise<Message[]> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.log(`Invalid chatId: ${chatId}`);
      return [];
    }

    const skip = (page - 1) * limit;

    try {
      const messages = await MessageModel.find({ chat: chatId })
        .populate('sender', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IMessageModel[];

      const botMessages = await BotMessageModel.find({ chatId })
        .populate('senderId', 'name')
        .populate('suggestedUser', 'name profileImageUrl category')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IBotMessageModel[];

      const mappedMessages = messages.map((msg: IMessageModel) => this.mapToDomain(msg));
      const mappedBotMessages = botMessages.map((msg: IBotMessageModel) => this.mapToDomain(msg));

      const allMessages = [...mappedMessages, ...mappedBotMessages].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      const paginatedMessages = allMessages.slice(0, limit);

      console.log(`Fetched ${paginatedMessages.length} messages for chatId: ${chatId}`);
      return paginatedMessages;
    } catch (error) {
      console.error(`Error fetching messages for chatId: ${chatId}`, error);
      throw error;
    }
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const messageResult = await MessageModel.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userObjectId } },
      { new: true }
    ).exec();

    if (!messageResult) {
      await BotMessageModel.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: userObjectId } },
        { new: true }
      ).exec();
    }
  }
}