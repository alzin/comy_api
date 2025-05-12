import mongoose from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import { BotMessageModel, IBotMessageModel } from '../database/models/models/BotMessageModel';
import { ChatModel, IChatModel } from '../database/models/ChatModel';

// Repository for managing messages
export class MongoMessageRepository implements IMessageRepository {
  // Map MongoDB document to Message entity
  private mapToDomain(messageDoc: IMessageModel | IBotMessageModel): Message {
    if ('sender' in messageDoc) {
      // For messages (from MessageModel)
      return {
        id: messageDoc._id.toString(),
        sender: messageDoc.sender.toString(),
        content: messageDoc.content,
        chatId: messageDoc.chat.toString(),
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdAt: messageDoc.createdAt
      };
    } else {
      // For botmessages (from BotMessageModel)
      return {
        id: messageDoc._id.toString(),
        sender: messageDoc.senderId.toString(),
        content: messageDoc.content || '',
        chatId: messageDoc.chatId.toString(),
        readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdAt: messageDoc.createdAt
      };
    }
  }

  // Check if the chat is a private bot chat
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

  // Create a new message
  async create(message: Message): Promise<Message> {
    const isBotChat = await this.isBotChat(message.chatId);

    if (isBotChat) {
      const newMessage = new BotMessageModel({
        senderId: new mongoose.Types.ObjectId(message.sender),
        chatId: new mongoose.Types.ObjectId(message.chatId),
        recipientId: new mongoose.Types.ObjectId(
          message.readBy && message.readBy.length > 0 ? message.readBy[0] : message.sender
        ),
        content: message.content,
        readBy: message.readBy?.map(id => new mongoose.Types.ObjectId(id)) || [],
        status: 'pending' // Default status for bot messages
      });
      const savedMessage = await newMessage.save();
      return this.mapToDomain(savedMessage);
    } else {
      const newMessage = new MessageModel({
        sender: new mongoose.Types.ObjectId(message.sender),
        chat: new mongoose.Types.ObjectId(message.chatId),
        content: message.content,
        readBy: message.readBy?.map(id => new mongoose.Types.ObjectId(id)) || []
      });
      const savedMessage = await newMessage.save();
      return this.mapToDomain(savedMessage);
    }
  }

  // Retrieve messages by chat ID
  async findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.log(`MongoMessageRepository: Invalid chatId: ${chatId}`);
      return [];
    }
    const chatObjectId = new mongoose.Types.ObjectId(chatId);
    const isBotChat = await this.isBotChat(chatId);

    let messages: (IMessageModel | IBotMessageModel)[];

    if (isBotChat) {
      const query = BotMessageModel.find({ chatId: chatObjectId });
      if (page && limit) {
        const skip = (page - 1) * limit;
        query.skip(skip).limit(limit);
      }
      messages = await query.sort({ createdAt: -1 }).exec();
    } else {
      const query = MessageModel.find({ chat: chatObjectId });
      if (page && limit) {
        const skip = (page - 1) * limit;
        query.skip(skip).limit(limit);
      }
      messages = await query.sort({ createdAt: -1 }).exec();
    }

    console.log(`MongoMessageRepository: Found ${messages.length} messages for chatId: ${chatId} in ${isBotChat ? 'botmessages' : 'messages'}`);
    return messages.map(this.mapToDomain);
  }

  // Update the list of users who read the message
  async updateReadBy(messageId: string, userId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Try updating in messages
    const messageResult = await MessageModel.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userObjectId } },
      { new: true }
    ).exec();

    // If not found in messages, try botmessages
    if (!messageResult) {
      await BotMessageModel.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: userObjectId } },
        { new: true }
      ).exec();
    }
  }
}