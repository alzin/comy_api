import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import mongoose from 'mongoose';

export class MongoMessageRepository implements IMessageRepository {
  private mapToDomain(messageDoc: IMessageModel): Message {
    return {
      id: messageDoc._id.toString(),
      sender: messageDoc.sender.toString(),
      content: messageDoc.content,
      chat: messageDoc.chat.toString(),
      readBy: messageDoc.readBy.map(id => id.toString()),
      createdAt: messageDoc.createdAt,
    };
  }

  async create(message: Message): Promise<Message> {
    const newMessage = new MessageModel({
      ...message,
      sender: new mongoose.Types.ObjectId(message.sender),
      chat: new mongoose.Types.ObjectId(message.chat),
      readBy: message.readBy.map(id => new mongoose.Types.ObjectId(id)),
    });
    const savedMessage = await newMessage.save();
    return this.mapToDomain(savedMessage);
  }

  async findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]> {
    const query = MessageModel.find({ chat: chatId });
    
    if (page && limit) {
      const skip = (page - 1) * limit;
      query.skip(skip).limit(limit);
    }

    const messages = await query.sort({ createdAt: -1 }).exec();
    return messages.map(this.mapToDomain);
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    await MessageModel.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } },
      { new: true }
    ).exec();
  }
}