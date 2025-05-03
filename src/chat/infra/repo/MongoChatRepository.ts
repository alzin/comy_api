import mongoose from 'mongoose';
import ChatModel, { IChatModel } from '../database/models/ChatModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';

// Repository for managing chats
export class MongoChatRepository implements IChatRepository {
  // Map MongoDB document to Chat entity
  private mapToDomain(chatDoc: IChatModel): Chat {
    return {
      id: chatDoc._id.toString(),
      name: chatDoc.name,
      isGroupChat: chatDoc.isGroupChat,
      users: chatDoc.users.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdAt: chatDoc.createdAt,
      updatedAt: chatDoc.updatedAt,
      latestMessage: chatDoc.latestMessage ? chatDoc.latestMessage.toString() : null
    };
  }

  // Create a new chat
  async create(chat: Chat): Promise<Chat> {
    const newChat = await ChatModel.create({
      ...chat,
      users: chat.users.map(id => new mongoose.Types.ObjectId(id)),
      latestMessage: chat.latestMessage ? new mongoose.Types.ObjectId(chat.latestMessage) : null
    });
    return this.mapToDomain(newChat);
  }

  // Retrieve chats by user ID
  async findByUserId(userId: string): Promise<Chat[]> {
    const chats = await ChatModel.find({
      users: new mongoose.Types.ObjectId(userId),
    }).exec();
    return chats.map(this.mapToDomain);
  }

  // Retrieve chat by user IDs
  async findByUsers(userIds: string[]): Promise<Chat | null> {
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: userIds.map(id => new mongoose.Types.ObjectId(id)),
        $size: userIds.length
      }
    }).exec();
    return chat ? this.mapToDomain(chat) : null;
  }

  // Retrieve private chat ID between two users
  async getPrivateChatId(userId: string, virtualUserId: string): Promise<string | null> {
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(virtualUserId)
        ],
        $size: 2
      }
    }).exec();
    return chat ? chat._id.toString() : null;
  }

  // Update chat
  async update(chatId: string, update: Partial<Chat>): Promise<void> {
    const updateFields: any = {};
    if (update.latestMessage) {
      updateFields.latestMessage = new mongoose.Types.ObjectId(update.latestMessage);
    } else if (update.latestMessage === null) {
      updateFields.latestMessage = null;
    }
    await ChatModel.findByIdAndUpdate(
      chatId,
      { $set: updateFields },
      { new: true }
    ).exec();
  }
}