// src/chat/infra/repo/MongoChatRepository.ts
import mongoose, { Types } from 'mongoose';
import { ChatModel, IChatModel } from '../database/models/ChatModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat, LatestMessage, ChatUser } from '../../domain/entities/Chat';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  profileImageUrl: string;
}

type PopulatedChatDocument = mongoose.Document<unknown, {}, IChatModel> & Omit<IChatModel, 'users'> & {
  users: PopulatedUser[];
  __v: number;
};

export class MongoChatRepository implements IChatRepository {
  private mapMessageToDomain(messageDoc: IMessageModel | IBotMessageModel | null): LatestMessage | null {
    if (!messageDoc) return null;

    const content = messageDoc.content || '';
    const truncatedContent = content.length > 18 ? content.substring(0, 18) : content;

    return {
      id: messageDoc._id.toString(),
      content: truncatedContent,
      createdAt: messageDoc.createdAt.toString(),
      readBy: messageDoc.readBy.map((id: mongoose.Types.ObjectId) => id.toString()),
    };
  }

  private async mapToDomain(chatDoc: IChatModel | PopulatedChatDocument): Promise<Chat> {
    const botId = process.env.BOT_ID;
    const adminId = process.env.ADMIN;

    const isPopulated = (doc: any): doc is PopulatedChatDocument =>
      doc.users && doc.users[0] && 'name' in doc.users[0];

    let profileImageUrl = chatDoc.profileImageUrl || '';
    if (isPopulated(chatDoc) && !profileImageUrl) {
      const nonBotUsers = chatDoc.users.filter((user) => user._id.toString() !== botId);
      profileImageUrl = nonBotUsers[0]?.profileImageUrl || '';
    }

    let latestMessage: LatestMessage | null = null;
    const latestUserMessage = await MessageModel.findOne({ chat: chatDoc._id })
      .sort({ createdAt: -1 })
      .exec();
    const latestBotMessage = await BotMessageModel.findOne({ chatId: chatDoc._id.toString() })
      .sort({ createdAt: -1 })
      .exec();

    if (latestUserMessage || latestBotMessage) {
      const latest = latestUserMessage && latestBotMessage
        ? latestUserMessage.createdAt > latestBotMessage.createdAt
          ? latestUserMessage
          : latestBotMessage
        : latestUserMessage || latestBotMessage;
      if (latest) {
        latestMessage = this.mapMessageToDomain(latest);
        await ChatModel.findByIdAndUpdate(chatDoc._id, { latestMessage: latest._id }, { new: true }).exec();
      }
    }

    const users: ChatUser[] = isPopulated(chatDoc)
      ? chatDoc.users.map((user: PopulatedUser) => {
          const userIdStr = user._id.toString();
          return {
            role: userIdStr === botId ? 'bot' : userIdStr === adminId ? 'admin' : 'user',
            id: userIdStr,
            image: user.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png',
            name: user.name,
          };
        })
      : chatDoc.users.map((id: mongoose.Types.ObjectId) => {
          const userIdStr = id.toString();
          return {
            role: userIdStr === botId ? 'bot' : userIdStr === adminId ? 'admin' : 'user',
            id: userIdStr,
            image: '',
          };
        });

    return {
      id: chatDoc._id.toString(),
      name: chatDoc.name,
      isGroup: chatDoc.isGroupChat,
      users,
      createdAt: chatDoc.createdAt.toString(),
      updatedAt: chatDoc.updatedAt.toString(),
      latestMessage,
      //profileImageUrl,
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
      name: chat.name,
      isGroupChat: chat.isGroup,
      users: chat.users.map((user: ChatUser) => new mongoose.Types.ObjectId(user.id)),
      //profileImageUrl: chat.profileImageUrl,
      latestMessage: chat.latestMessage?.id ? new mongoose.Types.ObjectId(chat.latestMessage.id) : null,
      createdAt: chat.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      updatedAt: chat.updatedAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
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
    const chats = await ChatModel.find({ users: new mongoose.Types.ObjectId(userId) })
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();
    return Promise.all(chats.map((chat) => this.mapToDomain(chat)));
  }

  async findByUsers(userIds: string[]): Promise<Chat | null> {
    if (!userIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return null;
    }
    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: userIds.map((id) => new mongoose.Types.ObjectId(id)),
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
        $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(virtualUserId)],
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
    if (update.latestMessage?.id) {
      updateFields.latestMessage = new mongoose.Types.ObjectId(update.latestMessage.id);
    } else if (update.latestMessage === null) {
      updateFields.latestMessage = null;
    }
    if (update.isGroup !== undefined) {
      updateFields.isGroupChat = update.isGroup;
    }
    if (update.name) {
      updateFields.name = update.name;
    }
    //if (update.profileImageUrl !== undefined) {
      //updateFields.profileImageUrl = update.profileImageUrl;
   // }
    if (update.createdAt) {
      updateFields.createdAt = update.createdAt;
    }
    if (update.updatedAt) {
      updateFields.updatedAt = update.updatedAt;
    }
    await ChatModel.findByIdAndUpdate(chatId, { $set: updateFields }, { new: true }).exec();
  }
}