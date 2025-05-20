import mongoose from 'mongoose';
import { ChatModel, IChatModel } from '../database/models/ChatModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  profileImageUrl: string;
}

interface PopulatedChatModel {
  _id: mongoose.Types.ObjectId;
  name: string;
  isGroupChat: boolean;
  users: PopulatedUser[];
  profileImageUrl: string;
  botProfileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  latestMessage?: mongoose.Types.ObjectId | null;
}

export class MongoChatRepository implements IChatRepository {
  private mapToDomain(chatDoc: PopulatedChatModel | IChatModel): Chat {
    const botId = process.env.BOT_ID || '681c757539ec003942b3f97e';
    const isPopulated = (doc: any): doc is PopulatedChatModel =>
      doc.users && doc.users[0] && 'name' in doc.users[0];

    if (isPopulated(chatDoc)) {
      let profileImageUrl = chatDoc.profileImageUrl || '';
      let botProfileImageUrl = chatDoc.botProfileImageUrl;

      if (!profileImageUrl) {
        if (chatDoc.isGroupChat) {
          const otherUser = chatDoc.users.find(user => user._id.toString() !== botId);
          profileImageUrl = otherUser ? otherUser.profileImageUrl || '' : '';
          const botUser = chatDoc.users.find(user => user._id.toString() === botId);
          botProfileImageUrl = botUser ? botUser.profileImageUrl || '' : '';
        } else {
          const botUser = chatDoc.users.find(user => user._id.toString() === botId);
          profileImageUrl = botUser ? botUser.profileImageUrl || '' : '';
        }
      }

      return {
        id: chatDoc._id.toString(),
        name: chatDoc.name,
        isGroup: chatDoc.isGroupChat, 
        users: chatDoc.users.map((user: PopulatedUser) => user._id.toString()),
        profileImageUrl,
        botProfileImageUrl,
        createdAt: chatDoc.createdAt,
        updatedAt: chatDoc.updatedAt,
        latestMessage: chatDoc.latestMessage ? chatDoc.latestMessage.toString() : null,
      };
    }

    return {
      id: chatDoc._id.toString(),
      name: chatDoc.name,
      isGroup: chatDoc.isGroupChat, 
      users: chatDoc.users.map((id: mongoose.Types.ObjectId) => id.toString()),
      profileImageUrl: chatDoc.profileImageUrl || '',
      botProfileImageUrl: chatDoc.botProfileImageUrl,
      createdAt: chatDoc.createdAt,
      updatedAt: chatDoc.updatedAt,
      latestMessage: chatDoc.latestMessage ? chatDoc.latestMessage.toString() : null,
    };
  }

  async findById(chatId: string): Promise<Chat | null> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return null;
    }
    const chatDoc = await ChatModel.findById(chatId)
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    if (!chatDoc) {
      return null;
    }
    return this.mapToDomain(chatDoc);
  }

  async create(chat: Chat): Promise<Chat> {
    const newChat = await ChatModel.create({
      ...chat,
      isGroupChat: chat.isGroup, 
      users: chat.users.map(id => new mongoose.Types.ObjectId(id)),
      latestMessage: chat.latestMessage ? new mongoose.Types.ObjectId(chat.latestMessage) : null,
    });
    const populatedChat = await ChatModel.findById(newChat._id)
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    if (!populatedChat) {
      throw new Error('Failed to populate created chat');
    }
    return this.mapToDomain(populatedChat);
  }

  async findByUserId(userId: string): Promise<Chat[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }
    const chats = await ChatModel.find({
      users: new mongoose.Types.ObjectId(userId),
    })
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    return chats.map((chat: PopulatedChatModel | IChatModel) => this.mapToDomain(chat));
  }

  async findByUsers(userIds: string[]): Promise<Chat | null> {
    if (!userIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return null;
    }
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: userIds.map(id => new mongoose.Types.ObjectId(id)),
        $size: userIds.length,
      },
    })
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    return chat ? this.mapToDomain(chat) : null;
  }

  async getPrivateChatId(userId: string, virtualUserId: string): Promise<string | null> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(virtualUserId)) {
      console.log(`Invalid userId: ${userId} or virtualUserId: ${virtualUserId}`);
      return null;
    }
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(virtualUserId),
        ],
        $size: 2,
      },
    })
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    return chat ? chat._id.toString() : null;
  }

  async update(chatId: string, update: Partial<Chat>): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return;
    }
    const updateFields: any = {};
    if (update.latestMessage) {
      updateFields.latestMessage = new mongoose.Types.ObjectId(update.latestMessage);
    } else if (update.latestMessage === null) {
      updateFields.latestMessage = null;
    }
    if (update.isGroup !== undefined) {
      updateFields.isGroupChat = update.isGroup;
    }
    await ChatModel.findByIdAndUpdate(chatId, { $set: updateFields }, { new: true }).exec();
  }
}