import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';
import ChatModel, { IChatModel } from '../database/models/ChatModel';
import mongoose from 'mongoose';

export class MongoChatRepository implements IChatRepository {
  private mapToDomain(chatDoc: IChatModel): Chat {
    return {
      id: chatDoc._id.toString(),
      name: chatDoc.name,
      isGroupChat: chatDoc.isGroupChat,
      users: chatDoc.users.map(id => id.toString()),
      createdAt: chatDoc.createdAt,
    };
  }

  async create(chat: Chat): Promise<Chat> {
    const newChat = new ChatModel({
      ...chat,
      users: chat.users.map(id => new mongoose.Types.ObjectId(id)),
    });
    const savedChat = await newChat.save();
    return this.mapToDomain(savedChat);
  }

  async findByUserId(userId: string): Promise<Chat[]> {
    const chats = await ChatModel.find({ users: new mongoose.Types.ObjectId(userId) }).exec();
    return chats.map(this.mapToDomain);
  }

  async findById(chatId: string): Promise<Chat | null> {
    const chat = await ChatModel.findById(chatId).exec();
    return chat ? this.mapToDomain(chat) : null;
  }

  async findByUsers(userIds: string[]): Promise<Chat | null> {
    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: { $all: objectIds, $size: objectIds.length },
    }).exec();
    return chat ? this.mapToDomain(chat) : null;
  }

  async update(chatId: string, update: Partial<Chat>): Promise<void> {
    const updateFields: any = {};
    if (update.latestMessage) {
      updateFields.latestMessage = new mongoose.Types.ObjectId(update.latestMessage);
    }
    await ChatModel.findByIdAndUpdate(chatId, { $set: updateFields }).exec();
  }
}