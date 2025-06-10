import mongoose, { Types } from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { ChatModel } from '../database/models/ChatModel';
import { UserModel, UserDocument } from '../../../infra/database/models/UserModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { CONFIG } from '../../../main/config/config';

const getSenderProfileImageUrl = async (senderId: string): Promise<string> => {
  if (senderId === CONFIG.BOT_ID) {
    return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg';
  }
  const user = await UserModel.findById(senderId).select('profileImageUrl').exec();
  return user?.profileImageUrl;
};

export class MongoMessageRepository implements IMessageRepository {
  constructor(private chatRepository: IChatRepository) { }

  async generateId(): Promise<string> {
    return new mongoose.Types.ObjectId().toString();
  }

  async create(message: Message, userId?: string): Promise<Message> {
    try {
      if (!(await this.chatRepository.isValidId(message.chatId))) {
        throw new Error(`Invalid chatId: ${message.chatId}`);
      }
      if (!(await this.chatRepository.isValidId(message.senderId))) {
        throw new Error(`Invalid senderId: ${message.senderId}`);
      }

      const senderProfileImageUrl = await getSenderProfileImageUrl(message.senderId);
      const readBy = [...new Set([...message.readBy, ...(userId ? [userId] : [])])];
      const messageDoc = new MessageModel({
        _id: message.id ? new mongoose.Types.ObjectId(message.id) : new mongoose.Types.ObjectId(),
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        chat: message.chatId,
        createdAt: message.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: readBy.map(id => new mongoose.Types.ObjectId(id)),
        isMatchCard: message.isMatchCard || false,
        isSuggested: message.isSuggested || false,
        suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl,
        suggestedUserName: message.isMatchCard ? message.suggestedUserName : undefined,
        suggestedUserCategory: message.isMatchCard ? message.suggestedUserCategory : undefined,
        status: message.isMatchCard ? (message.status || 'pending') : undefined,
        senderProfileImageUrl: message.senderProfileImageUrl || senderProfileImageUrl,
        images: message.images || [],
      });
      await messageDoc.save();
      console.log(`Created message with ID: ${messageDoc._id} in chat ${message.chatId}, isMatchCard: ${message.isMatchCard}, isSuggested: ${message.isSuggested}, status: ${message.status}`);

      return {
        id: messageDoc._id.toString(),
        senderId: messageDoc.senderId,
        senderName: messageDoc.senderName,
        content: messageDoc.content || '',
        chatId: messageDoc.chat.toString(),
        createdAt: messageDoc.createdAt.toString(),
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        status: messageDoc.status,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: message.isSuggested || message.isMatchCard ? message.relatedUserId : undefined,
        images: messageDoc.images || [],
      };
    } catch (error) {
      console.error(`Error creating message for chatId: ${message.chatId}`, error);
      throw error;
    }
  }

  private async mapToDomain(messageDoc: IMessageModel | IBotMessageModel): Promise<Message> {
    if (!messageDoc) {
      throw new Error('Message document is null');
    }

    const isBotMessage = 'suggestedUser' in messageDoc || 'recipientId' in messageDoc;
    let senderId: string;

    if (isBotMessage) {
      const botMessage = messageDoc as IBotMessageModel;
      senderId = botMessage.senderId ? botMessage.senderId.toString() : '';
    } else {
      const userMessage = messageDoc as IMessageModel;
      senderId = userMessage.senderId ? userMessage.senderId.toString() : '';
    }

    console.log(`Processing message with senderId: ${senderId}, messageDoc:`, messageDoc);

    if (!(await this.chatRepository.isValidId(senderId))) {
      console.error(`Invalid senderId detected: ${senderId} for messageDoc:`, messageDoc);
      const fallbackSenderId = CONFIG.BOT_ID;
      const senderName = 'COMY オフィシャル AI';
      const senderProfileImageUrl = 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg';

      const baseMessage: Message = {
        id: messageDoc._id.toString(),
        senderId: fallbackSenderId,
        senderName,
        content: messageDoc.content || '',
        chatId: ('chat' in messageDoc ? messageDoc.chat : messageDoc.chatId)?.toString() || '',
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdAt: messageDoc.createdAt.toString(),
        isMatchCard: isBotMessage ? (messageDoc as IBotMessageModel).isMatchCard : (messageDoc as IMessageModel).isMatchCard,
        isSuggested: isBotMessage ? (messageDoc as IBotMessageModel).isSuggested : (messageDoc as IMessageModel).isSuggested,
        suggestedUserProfileImageUrl: isBotMessage
          ? (messageDoc as IBotMessageModel).suggestedUserProfileImageUrl
          : (messageDoc as IMessageModel).suggestedUserProfileImageUrl,
        suggestedUserName: isBotMessage
          ? (messageDoc as IBotMessageModel).suggestedUserName
          : (messageDoc as IMessageModel).isMatchCard
            ? (messageDoc as IMessageModel).suggestedUserName
            : undefined,
        suggestedUserCategory: isBotMessage
          ? (messageDoc as IBotMessageModel).suggestedUserCategory
          : (messageDoc as IMessageModel).isMatchCard
            ? (messageDoc as IMessageModel).suggestedUserCategory
            : undefined,
        relatedUserId: isBotMessage && ((messageDoc as IBotMessageModel).isSuggested || (messageDoc as IBotMessageModel).isMatchCard)
          ? (messageDoc as IBotMessageModel).suggestedUser
            ? ((messageDoc as IBotMessageModel).suggestedUser as any)._id.toString()
            : undefined
          : undefined,
        status: (isBotMessage && (messageDoc as IBotMessageModel).isMatchCard) || (!isBotMessage && (messageDoc as IMessageModel).isMatchCard)
          ? (isBotMessage ? (messageDoc as IBotMessageModel).status : (messageDoc as IMessageModel).status) || 'pending'
          : undefined,
        senderProfileImageUrl,
        images: messageDoc.images || [],
      };

      if (isBotMessage && (messageDoc as IBotMessageModel).suggestedUser && baseMessage.isMatchCard) {
        const suggestedUser = (messageDoc as IBotMessageModel).suggestedUser as unknown as UserDocument;
        return {
          ...baseMessage,
          suggestedUserProfileImageUrl: baseMessage.suggestedUserProfileImageUrl || suggestedUser.profileImageUrl || undefined,
          suggestedUserName: baseMessage.suggestedUserName || suggestedUser.name || 'User',
          suggestedUserCategory: baseMessage.suggestedUserCategory || suggestedUser.category || 'unknown',
        };
      }

      return baseMessage;
    }

    const sender = await UserModel.findById(senderId).select('name').exec();
    const senderName = sender ? sender.name : (senderId === CONFIG.BOT_ID ? 'COMY オフィシャル AI' : 'Unknown User');
    const senderProfileImageUrl = messageDoc.senderProfileImageUrl || (await getSenderProfileImageUrl(senderId));

    let relatedUserId: string | undefined;
    if (isBotMessage && ((messageDoc as IBotMessageModel).isSuggested || (messageDoc as IBotMessageModel).isMatchCard)) {
      relatedUserId = (messageDoc as IBotMessageModel).suggestedUser
        ? ((messageDoc as IBotMessageModel).suggestedUser as any)._id.toString()
        : undefined;
      console.log(`mapToDomain: relatedUserId set to ${relatedUserId} for message ${messageDoc._id}`);
    }

    const baseMessage: Message = {
      id: messageDoc._id.toString(),
      senderId,
      senderName,
      content: messageDoc.content || '',
      chatId: ('chat' in messageDoc ? messageDoc.chat : messageDoc.chatId)?.toString() || '',
      readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdAt: messageDoc.createdAt.toString(),
      isMatchCard: isBotMessage ? (messageDoc as IBotMessageModel).isMatchCard : (messageDoc as IMessageModel).isMatchCard,
      isSuggested: isBotMessage ? (messageDoc as IBotMessageModel).isSuggested : (messageDoc as IMessageModel).isSuggested,
      suggestedUserProfileImageUrl: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserProfileImageUrl
        : (messageDoc as IMessageModel).suggestedUserProfileImageUrl,
      suggestedUserName: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserName
        : (messageDoc as IMessageModel).isMatchCard
          ? (messageDoc as IMessageModel).suggestedUserName
          : undefined,
      suggestedUserCategory: isBotMessage
        ? (messageDoc as IBotMessageModel).suggestedUserCategory
        : (messageDoc as IMessageModel).isMatchCard
          ? (messageDoc as IMessageModel).suggestedUserCategory
          : undefined,
      relatedUserId,
      status: (isBotMessage && (messageDoc as IBotMessageModel).isMatchCard) || (!isBotMessage && (messageDoc as IMessageModel).isMatchCard)
        ? (isBotMessage ? (messageDoc as IBotMessageModel).status : (messageDoc as IMessageModel).status) || 'pending'
        : undefined,
      senderProfileImageUrl,
      images: messageDoc.images || [],
    };

    return baseMessage;
  }

  private async isBotChat(chatId: string): Promise<boolean> {
    if (!(await this.chatRepository.isValidId(chatId))) {
      return false;
    }
    const chat = await ChatModel.findById(chatId).exec();
    if (!chat || chat.isGroupChat) {
      return false;
    }
    const virtualUserId = CONFIG.BOT_ID;
    return chat.users.some((userId: mongoose.Types.ObjectId) => userId.toString() === virtualUserId);
  }

  async findByChatId(chatId: string, page: number = 1, limit: number = 20): Promise<Message[]> {
    if (!(await this.chatRepository.isValidId(chatId))) {
      console.log(`Invalid chatId: ${chatId}`);
      return [];
    }

    // const skip = (page - 1) * limit;

    try {
      const messages = await MessageModel.find({ chat: chatId })
        // .skip(skip)
        // .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IMessageModel[];

      const botMessages = await BotMessageModel.find({ chatId })
        .populate('suggestedUser', '_id')
        // .skip(skip)
        // .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IBotMessageModel[];

      const mappedMessages = await Promise.all(
        [...messages, ...botMessages].map((msg: IMessageModel | IBotMessageModel) => this.mapToDomain(msg))
      );

      const allMessages = mappedMessages.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // const paginatedMessages = allMessages.slice(0, limit);

      // console.log(`Fetched ${paginatedMessages.length} messages for chatId: ${chatId}`);
      // return paginatedMessages.length > 0 ? paginatedMessages : [];
      // 
      return allMessages.length > 0 ? allMessages : [];
    } catch (error) {
      console.error(`Error fetching messages for chatId: ${chatId}`, error);
      throw error;
    }
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    if (!(await this.chatRepository.isValidId(messageId))) {
      throw new Error(`Invalid messageId: ${messageId}`);
    }
    if (!(await this.chatRepository.isValidId(userId))) {
      throw new Error(`Invalid userId: ${userId}`);
    }

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

  async updateReadByForChat(chatId: string, userId: string): Promise<void> {
    if (!(await this.chatRepository.isValidId(chatId))) {
      throw new Error(`Invalid chatId: ${chatId}`);
    }
    if (!(await this.chatRepository.isValidId(userId))) {
      throw new Error(`Invalid userId: ${userId}`);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    await MessageModel.updateMany(
      { chat: chatId },
      { $addToSet: { readBy: userObjectId } }
    ).exec();

    await BotMessageModel.updateMany(
      { chatId },
      { $addToSet: { readBy: userObjectId } }
    ).exec();
  }
}