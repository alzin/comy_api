import mongoose from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';

// Repository for managing messages
export class MongoMessageRepository implements IMessageRepository {
  // Map MongoDB document to Message entity
  private mapToDomain(messageDoc: IMessageModel): Message {
    return {
      id: messageDoc._id.toString(),
      sender: messageDoc.sender.toString(),
      content: messageDoc.content,
      chatId: messageDoc.chat.toString(),
      readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdAt: messageDoc.createdAt
    };
  }

  // Create a new message
  async create(message: Message): Promise<Message> {
    const newMessage = new MessageModel({
      ...message,
      sender: new mongoose.Types.ObjectId(message.sender),
      chat: new mongoose.Types.ObjectId(message.chatId),
      readBy: message.readBy?.map(id => new mongoose.Types.ObjectId(id)) || []
    });
    const savedMessage = await newMessage.save();
    return this.mapToDomain(savedMessage);
  }

  // Retrieve messages by chat ID
  async findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]> {
    const query = MessageModel.find({ chat: chatId });
    
    if (page && limit) {
      const skip = (page - 1) * limit;
      query.skip(skip).limit(limit);
    }

    const messages = await query.sort({ createdAt: -1 }).exec();
    return messages.map(this.mapToDomain);
  }

  // Update the list of users who read the message
  async updateReadBy(messageId: string, userId: string): Promise<void> {
    await MessageModel.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    ).exec();
  }
}