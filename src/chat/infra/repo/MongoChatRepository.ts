import { Types, Document } from 'mongoose';
import { ChatModel, IChatModel } from '../database/models/ChatModel';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat, LatestMessage } from '../../domain/entities/Chat';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { CONFIG } from '../../../main/config/config';
import { toObjectId, validateObjectId, formatDate } from '../utils/mongoUtils';
import { mapToChatDomain, mapToLatestMessage } from '../mappers/ChatMapper';

interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  profileImageUrl: string;
}

type PopulatedChatDocument = Document<unknown, {}, IChatModel> & IChatModel & {
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

type MessageDocument = 
  | (Document<unknown, {}, IMessageModel> & IMessageModel & Required<{ _id: Types.ObjectId; }> & { __v: number; })
  | (Document<unknown, {}, IBotMessageModel> & IBotMessageModel & Required<{ _id: Types.ObjectId; }> & { __v: number; });

export class MongoChatRepository implements IChatRepository {
  private readonly BOT_ID = CONFIG.BOT_ID;
  private readonly ADMIN_ID = CONFIG.ADMIN;

  constructor() {}

  async isValidId(id: string): Promise<boolean> {
    validateObjectId(id, 'chatId');
    const chat = await ChatModel.findById(id).exec();
    return !!chat;
  }

  private async populateChatUsers<T extends IChatModel | IChatModel[] | null>(chatDoc: T): Promise<T> {
    if (!chatDoc) return chatDoc;
    return await ChatModel.populate(chatDoc, {
      path: 'users',
      select: 'name profileImageUrl',
    }) as unknown as T;
  }

  private async getLatestMessage(chatId: Types.ObjectId): Promise<LatestMessage | null> {
    const [latestUserMessage, latestBotMessage] = await Promise.all([
      MessageModel.findOne({ chat: chatId }).sort({ createdAt: -1 }).exec(),
      BotMessageModel.findOne({ chatId: chatId.toString() }).sort({ createdAt: -1 }).exec(),
    ]);

    const latest = [latestUserMessage, latestBotMessage]
      .filter((msg): msg is MessageDocument => !!msg)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latest) {
      await ChatModel.findByIdAndUpdate(chatId, { latestMessage: latest._id }, { new: true }).exec();
    }

    return mapToLatestMessage(latest);
  }

  private prepareUpdateFields(update: Partial<Chat>): ChatUpdateFields {
    const updateFields: ChatUpdateFields = {};

    if (update.latestMessage?.id) {
      validateObjectId(update.latestMessage.id, 'latestMessage.id');
      updateFields.latestMessage = toObjectId(update.latestMessage.id);
    } else if (update.latestMessage === null) {
      updateFields.latestMessage = null;
    }

    if (update.isGroup !== undefined) updateFields.isGroupChat = update.isGroup;
    if (update.name) updateFields.name = update.name;
    if (update.createdAt) updateFields.createdAt = formatDate(update.createdAt);
    if (update.updatedAt) updateFields.updatedAt = formatDate(update.updatedAt);

    return updateFields;
  }

  async findById(chatId: string): Promise<Chat | null> {
    validateObjectId(chatId, 'chatId');

    const chatDoc = await this.populateChatUsers(
      await ChatModel.findById(chatId).exec(),
    ) as PopulatedChatDocument | null;

    if (!chatDoc) return null;

    const latestMessage = await this.getLatestMessage(chatDoc._id);
    return mapToChatDomain(chatDoc, latestMessage, this.BOT_ID);
  }

  async create(chat: Chat): Promise<Chat> {
    chat.users.forEach(user => validateObjectId(user.id, 'userId'));

    const newChat = await ChatModel.create({
      name: chat.name,
      isGroupChat: chat.isGroup,
      users: chat.users.map(user => toObjectId(user.id)),
      latestMessage: chat.latestMessage?.id ? toObjectId(chat.latestMessage.id) : null,
      createdAt: formatDate(chat.createdAt),
      updatedAt: formatDate(chat.updatedAt),
    });

    const populatedChat = await this.populateChatUsers(
      await ChatModel.findById(newChat._id).exec(),
    ) as PopulatedChatDocument;

    if (!populatedChat) throw new Error('Failed to populate created chat');

    let latestMessage: LatestMessage | null = null;
    if (chat.latestMessage?.id) {
      const messageDoc = await MessageModel.findById(chat.latestMessage.id).exec() ||
                        await BotMessageModel.findById(chat.latestMessage.id).exec();
      if (!messageDoc) throw new Error(`Invalid latest message with ID ${chat.latestMessage.id}`);
      latestMessage = mapToLatestMessage(messageDoc);
    } else {
      latestMessage = await this.getLatestMessage(populatedChat._id);
    }

    return mapToChatDomain(populatedChat, latestMessage, this.BOT_ID);
  }

  async findByUserId(userId: string): Promise<Chat[]> {
    validateObjectId(userId, 'userId');

    const chats = await this.populateChatUsers(
      await ChatModel.find({ users: toObjectId(userId) }).exec(),
    ) as PopulatedChatDocument[];

    return Promise.all(
      chats.map(async chat => {
        const latestMessage = await this.getLatestMessage(chat._id);
        return mapToChatDomain(chat, latestMessage, this.BOT_ID);
      }),
    );
  }

  async findByUsers(userIds: string[]): Promise<Chat | null> {
    userIds.forEach(id => validateObjectId(id, 'userId'));

    const chat = await this.populateChatUsers(
      await ChatModel.findOne({
        isGroupChat: false,
        users: { $all: userIds.map(id => toObjectId(id)), $size: userIds.length },
      }).exec(),
    ) as PopulatedChatDocument | null;

    if (!chat) return null;

    const latestMessage = await this.getLatestMessage(chat._id);
    return mapToChatDomain(chat, latestMessage, this.BOT_ID);
  }

  async getPrivateChatId(userId: string, virtualUserId: string): Promise<string | null> {
    validateObjectId(userId, 'userId');
    validateObjectId(virtualUserId, 'virtualUserId');

    const chat = await ChatModel.findOne({
      isGroupChat: false,
      users: { $all: [toObjectId(userId), toObjectId(virtualUserId)], $size: 2 },
    }).exec();

    return chat?._id.toString() || null;
  }

  async update(chatId: string, update: Partial<Chat>): Promise<void> {
    validateObjectId(chatId, 'chatId');

    const updateFields = this.prepareUpdateFields(update);

    await ChatModel.findByIdAndUpdate(chatId, { $set: updateFields }, { new: true }).exec();
  }
}