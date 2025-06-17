import mongoose, { Types } from 'mongoose';
import { ChatModel, IChatModel } from '../database/models/ChatModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat, LatestMessage, ChatUser } from '../../domain/entities/Chat';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { CONFIG } from '../../../main/config/config';

// Types
interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  profileImageUrl: string;
}

type PopulatedChatDocument = mongoose.Document<unknown, {}, IChatModel> & Omit<IChatModel, 'users'> & {
  users: PopulatedUser[];
  __v: number;
};

type ChatUpdateFields = {
  latestMessage?: Types.ObjectId | null;
  isGroupChat?: boolean;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class MongoChatRepository implements IChatRepository {
  // Constants
  private readonly BOT_ID = CONFIG.BOT_ID;
  private readonly ADMIN_ID = CONFIG.ADMIN;

  // Helper Methods
  private mapToLatestMessage(messageDoc: IMessageModel | IBotMessageModel | null): LatestMessage | null {
    if (!messageDoc) return null;

    return {
      id: messageDoc._id.toString(),
      content: messageDoc.content || '',
      createdAt: messageDoc.createdAt.toString(),
      readBy: messageDoc.readBy.map(id => id.toString()),
    };
  }

  private async getLatestMessage(chatId: Types.ObjectId): Promise<LatestMessage | null> {
    const [latestUserMessage, latestBotMessage] = await Promise.all([
      MessageModel.findOne({ chat: chatId }).sort({ createdAt: -1 }).exec(),
      BotMessageModel.findOne({ chatId: chatId.toString() }).sort({ createdAt: -1 }).exec()
    ]);

    const latest = [latestUserMessage, latestBotMessage]
      .filter(Boolean)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime())[0];

    if (latest) {
      await ChatModel.findByIdAndUpdate(chatId, { latestMessage: latest._id }, { new: true }).exec();
    }

    return latest ? this.mapToLatestMessage(latest) : null;
  }

  private mapToChatUser(user: PopulatedUser | Types.ObjectId): ChatUser {
    const isPopulated = (u: any): u is PopulatedUser => 'name' in u;
    const userId = isPopulated(user) ? user._id.toString() : user.toString();

    return {
      id: userId,
      role: this.getUserRole(userId),
      name: isPopulated(user) ? user.name : '',
      image: isPopulated(user) ? user.profileImageUrl : '',
    };
  }

  private getUserRole(userId: string): 'bot' | 'admin' | 'user' {
    return userId === this.BOT_ID ? 'bot' : 
           userId === this.ADMIN_ID ? 'admin' : 'user';
  }

  private async mapToChatDomain(chatDoc: IChatModel | PopulatedChatDocument): Promise<Chat> {
    const isPopulated = (doc: any): doc is PopulatedChatDocument => 
      doc.users && doc.users[0] && 'name' in doc.users[0];

    const profileImageUrl = chatDoc.profileImageUrl || 
      (isPopulated(chatDoc) 
        ? chatDoc.users.find(u => u._id.toString() !== this.BOT_ID)?.profileImageUrl || ''
        : '');

    const latestMessage = await this.getLatestMessage(chatDoc._id);

    const users = chatDoc.users.map(user => this.mapToChatUser(user));

    return {
      id: chatDoc._id.toString(),
      name: chatDoc.name,
      isGroup: chatDoc.isGroupChat,
      users,
      createdAt: chatDoc.createdAt.toString(),
      updatedAt: chatDoc.updatedAt.toString(),
      latestMessage,
      profileImageUrl,
    };
  }

  private async validateUserIds(userIds: string[]): Promise<void> {
    const validations = await Promise.all(userIds.map(id => this.isValidId(id)));
    if (!validations.every(valid => valid)) {
      throw new Error('One or more invalid user IDs');
    }
  }

  // Main Methods
  async isValidId(id: string): Promise<boolean> {
    return Types.ObjectId.isValid(id);
  }

  async findById(chatId: string): Promise<Chat | null> {
    if (!(await this.isValidId(chatId))) return null;

    const chatDoc = await ChatModel.findById(chatId)
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();

    return chatDoc ? this.mapToChatDomain(chatDoc) : null;
  }

  async create(chat: Chat): Promise<Chat> {
    await this.validateUserIds(chat.users.map(u => u.id));

    const newChat = await ChatModel.create({
      name: chat.name,
      isGroupChat: chat.isGroup,
      users: chat.users.map(user => new Types.ObjectId(user.id)),
      latestMessage: chat.latestMessage?.id ? new Types.ObjectId(chat.latestMessage.id) : null,
      createdAt: chat.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      updatedAt: chat.updatedAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    });

    const populatedChat = await ChatModel.findById(newChat._id)
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();

    if (!populatedChat) throw new Error('Failed to populate created chat');
    return this.mapToChatDomain(populatedChat);
  }

  async findByUserId(userId: string): Promise<Chat[]> {
    if (!(await this.isValidId(userId))) return [];

    const chats = await ChatModel.find({ users: new Types.ObjectId(userId) })
      .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
      .exec();

    return Promise.all(chats.map(chat => this.mapToChatDomain(chat)));
  }

  async findByUsers(userIds: string[]): Promise<Chat | null> {
    await this.validateUserIds(userIds);

    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: userIds.map(id => new Types.ObjectId(id)),
        $size: userIds.length,
      },
    })
    .populate<{ users: PopulatedUser[] }>('users', 'name email profileImageUrl')
    .exec();

    return chat ? this.mapToChatDomain(chat) : null;
  }

  async getPrivateChatId(userId: string, virtualUserId: string): Promise<string | null> {
    if (!(await this.isValidId(userId)) || !(await this.isValidId(virtualUserId))) {
      console.log(`Invalid userId: ${userId} or virtualUserId: ${virtualUserId}`);
      return null;
    }

    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: {
        $all: [new Types.ObjectId(userId), new Types.ObjectId(virtualUserId)],
        $size: 2,
      },
    }).exec();

    return chat?._id.toString() || null;
  }

  async update(chatId: string, update: Partial<Chat>): Promise<void> {
    if (!(await this.isValidId(chatId))) return;

    const updateFields: ChatUpdateFields = {};

    if (update.latestMessage?.id) {
      if (!(await this.isValidId(update.latestMessage.id))) {
        throw new Error('Invalid latestMessage ID');
      }
      updateFields.latestMessage = new Types.ObjectId(update.latestMessage.id);
    } else if (update.latestMessage === null) {
      updateFields.latestMessage = null;
    }

    if (update.isGroup !== undefined) updateFields.isGroupChat = update.isGroup;
    if (update.name) updateFields.name = update.name;
    if (update.createdAt) updateFields.createdAt = update.createdAt;
    if (update.updatedAt) updateFields.updatedAt = update.updatedAt;

    await ChatModel.findByIdAndUpdate(
      chatId, 
      { $set: updateFields }, 
      { new: true }
    ).exec();
  }
}