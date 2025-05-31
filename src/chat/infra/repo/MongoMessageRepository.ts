import mongoose, { Types } from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { ChatModel } from '../database/models/ChatModel';
import { UserModel, UserDocument } from '../../../infra/database/models/UserModel';

const getSenderProfileImageUrl = async (senderId: string): Promise<string> => {
  if (senderId === '681547798892749fbe910c02') {
    return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png';
  }
  const user = await UserModel.findById(senderId).select('profileImageUrl').exec();
  return user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';
};

export class MongoMessageRepository implements IMessageRepository {
  async create(message: Message, userId?: string): Promise<Message> {
    try {
      if (!mongoose.Types.ObjectId.isValid(message.senderId)) {
        throw new Error(`Invalid senderId: ${message.senderId} is not a valid ObjectId`);
      }
      if (!mongoose.Types.ObjectId.isValid(message.chatId)) {
        throw new Error(`Invalid chatId: ${message.chatId} is not a valid ObjectId`);
      }

      const senderProfileImageUrl = await getSenderProfileImageUrl(message.senderId);
      const readBy = [...new Set([...message.readBy, ...(userId ? [userId] : [])])];
      const messageDoc = new MessageModel({
        _id: new mongoose.Types.ObjectId(message.id),
        sender: message.senderId,
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
        senderProfileImageUrl: message.senderProfileImageUrl || senderProfileImageUrl
      });
      await messageDoc.save();
      console.log(`Created message with ID: ${message.id} in chat ${message.chatId}, isMatchCard: ${message.isMatchCard}, isSuggested: ${message.isSuggested}, status: ${message.status}`);

      return {
        id: messageDoc._id.toString(),
        senderId: message.senderId,
        senderName: message.senderName,
        content: messageDoc.content || '',
        chatId: messageDoc.chat.toString(),
        createdAt: messageDoc.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        isMatchCard: messageDoc.isMatchCard,
        isSuggested: messageDoc.isSuggested,
        suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
        suggestedUserName: messageDoc.suggestedUserName,
        suggestedUserCategory: messageDoc.suggestedUserCategory,
        status: messageDoc.status,
        senderProfileImageUrl: messageDoc.senderProfileImageUrl,
        relatedUserId: message.isSuggested || message.isMatchCard ? message.relatedUserId : undefined
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

    const isBotMessage = 'senderId' in messageDoc;
    let senderId: string;

    if (isBotMessage) {
      const botMessage = messageDoc as IBotMessageModel;
      senderId = botMessage.senderId ? botMessage.senderId.toString() : '';
    } else {
      const userMessage = messageDoc as IMessageModel;
      senderId = userMessage.sender ? userMessage.sender.toString() : '';
    }

    console.log(`Processing message with senderId: ${senderId}, messageDoc:`, messageDoc);

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      console.error(`Invalid senderId detected: ${senderId} for messageDoc:`, messageDoc);
      const fallbackSenderId = '681547798892749fbe910c02';
      const senderName = 'COMY オフィシャル AI';
      const senderProfileImageUrl = 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';

      const baseMessage: Message = {
        id: messageDoc._id.toString(),
        senderId: fallbackSenderId,
        senderName,
        content: messageDoc.content || '',
        chatId: ('chat' in messageDoc ? messageDoc.chat : messageDoc.chatId)?.toString() || '',
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdAt: messageDoc.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
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
        relatedUserId: isBotMessage && ((messageDoc as IBotMessageModel).isSuggested || (messageDoc as IBotMessageModel).isMatchCard)
          ? (messageDoc as IBotMessageModel).suggestedUser ? (messageDoc.suggestedUser as any)._id.toString() : undefined
          : undefined,
        status: (isBotMessage && (messageDoc as IBotMessageModel).isMatchCard) || (!isBotMessage && messageDoc.isMatchCard)
          ? (isBotMessage ? (messageDoc as IBotMessageModel).status : messageDoc.status) || 'pending'
          : undefined,
        senderProfileImageUrl
      };

      console.log(`mapToDomain: relatedUserId for fallback message: ${baseMessage.relatedUserId}`);

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

    const sender = await UserModel.findById(senderId).select('name').exec();
    const senderName = sender ? sender.name : (senderId === '681547798892749fbe910c02' ? 'COMY オフィシャル AI' : 'Unknown User');
    const senderProfileImageUrl = messageDoc.senderProfileImageUrl || (await getSenderProfileImageUrl(senderId));

    let relatedUserId: string | undefined;
    if (isBotMessage && ((messageDoc as IBotMessageModel).isSuggested || (messageDoc as IBotMessageModel).isMatchCard)) {
      relatedUserId = (messageDoc as IBotMessageModel).suggestedUser ? (messageDoc.suggestedUser as any)._id.toString() : undefined;
      console.log(`mapToDomain: relatedUserId set to ${relatedUserId} for message ${messageDoc._id}`);
    }

    const baseMessage: Message = {
      id: messageDoc._id.toString(),
      senderId,
      senderName,
      content: messageDoc.content || '',
      chatId: ('chat' in messageDoc ? messageDoc.chat : messageDoc.chatId)?.toString() || '',
      readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdAt: messageDoc.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
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
      relatedUserId,
      status: (isBotMessage && (messageDoc as IBotMessageModel).isMatchCard) || (!isBotMessage && messageDoc.isMatchCard)
        ? (isBotMessage ? (messageDoc as IBotMessageModel).status : messageDoc.status) || 'pending'
        : undefined,
      senderProfileImageUrl
    };

    console.log(`mapToDomain: relatedUserId for base message: ${baseMessage.relatedUserId}`);

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
    const virtualUserId = process.env.BOT_ID;
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
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IMessageModel[];

      const botMessages = await BotMessageModel.find({ chatId })
        .populate('suggestedUser', '_id') 
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as IBotMessageModel[];

      const mappedMessages = await Promise.all(
        [...messages, ...botMessages].map((msg: IMessageModel | IBotMessageModel) => this.mapToDomain(msg))
      );

      const allMessages = mappedMessages.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const paginatedMessages = allMessages.slice(0, limit);

      console.log(`Fetched ${paginatedMessages.length} messages for chatId: ${chatId}`);
      return paginatedMessages.length > 0 ? paginatedMessages : [];
    } catch (error) {
      console.error(`Error fetching messages for chatId: ${chatId}`, error);
      throw error;
    }
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error(`Invalid messageId: ${messageId}`);
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
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
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error(`Invalid chatId: ${chatId}`);
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
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