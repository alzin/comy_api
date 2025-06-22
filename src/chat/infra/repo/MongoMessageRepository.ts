import { Types } from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { BaseRepository } from '../repositories/base.repository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { CONFIG } from '../../../main/config/config';
import { IChatRepository } from '../../domain/repo/IChatRepository';

// Constants and Types
const BOT_DETAILS = {
  name: 'COMY オフィシャル AI',
  profileImageUrl: CONFIG.BOT_IMAGE_URL
};

type SenderDetails = {
  name: string;
  profileImageUrl: string;
};

export class MongoMessageRepository extends BaseRepository<IMessageModel> implements IMessageRepository {
  constructor(
    private userRepository: IUserRepository,
    private chatRepository: IChatRepository
  ) {
    super(MessageModel);
  }

  private async getSenderDetails(senderId: string): Promise<SenderDetails> {
    // Check for both BOT_ID and ADMIN to return BOT_DETAILS
    if (senderId === CONFIG.BOT_ID || senderId === CONFIG.ADMIN) {
      return BOT_DETAILS;
    }
    return this.getUserSenderDetails(senderId);
  }

  private async getUserSenderDetails(userId: string): Promise<SenderDetails> {
    const user = await this.userRepository.findById(userId);
    return {
      name: user?.name || 'Unknown User',
      profileImageUrl: user?.profileImageUrl || ''
    };
  }

  private toDomain(messageDoc: IMessageModel): Message {
    return {
      id: messageDoc._id.toString(),
      senderId: messageDoc.senderId,
      senderName: messageDoc.senderName,
      content: messageDoc.content || '',
      chatId: messageDoc.chat.toString(),
      createdAt: messageDoc.createdAt.toString(),
      readBy: messageDoc.readBy.map(id => id.toString()),
      isMatchCard: messageDoc.isMatchCard || false,
      isSuggested: messageDoc.isSuggested || false,
      suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
      suggestedUserName: messageDoc.suggestedUserName,
      suggestedUserCategory: messageDoc.suggestedUserCategory,
      status: messageDoc.status,
      senderProfileImageUrl: messageDoc.senderProfileImageUrl,
      relatedUserId: messageDoc.relatedUserId?.toString(),
      images: messageDoc.images || [],
    };
  }

  private convertBotMessageToDomain(botMsg: IBotMessageModel): Message {
    const relatedUserId = botMsg.suggestedUser 
      ? (botMsg.suggestedUser as unknown as Types.ObjectId).toString()
      : botMsg.relatedUserId?.toString();

    return {
      ...this.getBaseBotMessageFields(botMsg),
      suggestedUserName: botMsg.suggestedUserName,
      suggestedUserCategory: botMsg.suggestedUserCategory,
      relatedUserId,
    };
  }

  private getBaseBotMessageFields(botMsg: IBotMessageModel): Omit<Message, 'suggestedUserName' | 'suggestedUserCategory' | 'relatedUserId'> {
    return {
      id: botMsg._id.toString(),
      senderId: botMsg.senderId || CONFIG.BOT_ID,
      senderName: BOT_DETAILS.name,
      content: botMsg.content || '',
      chatId: botMsg.chatId.toString(),
      createdAt: botMsg.createdAt.toString(),
      readBy: botMsg.readBy.map(id => id.toString()),
      isMatchCard: botMsg.isMatchCard || false,
      isSuggested: botMsg.isSuggested || false,
      suggestedUserProfileImageUrl: botMsg.suggestedUserProfileImageUrl,
      status: botMsg.status,
      senderProfileImageUrl: BOT_DETAILS.profileImageUrl,
      images: botMsg.images || [],
    };
  }

  async create(message: Message, userId?: string): Promise<Message> {
    this.validateMessageIds(message, userId);
    
    const { name, profileImageUrl } = await this.getSenderDetails(message.senderId);
    const messageDoc = this.createMessageDocument(message, name, profileImageUrl, userId);
    
    const savedDoc = await this.executeQuery(messageDoc.save());
    return this.toDomain(savedDoc);
  }

  private validateMessageIds(message: Message, userId?: string) {
    this.validateObjectId(message.chatId, 'chatId');
    this.validateObjectId(message.senderId, 'senderId');
    if (userId) this.validateObjectId(userId, 'userId');
  }

  private createMessageDocument(
    message: Message, 
    senderName: string, 
    profileImageUrl: string, 
    userId?: string
  ): IMessageModel {
    return new MessageModel({
      _id: this.getMessageId(message.id),
      senderId: message.senderId,
      senderName,
      content: message.content,
      chat: this.toObjectId(message.chatId),
      createdAt: this.getMessageDate(message.createdAt),
      readBy: this.getReadByList(message.readBy, userId),
      isMatchCard: message.isMatchCard || false,
      isSuggested: message.isSuggested || false,
      suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl,
      suggestedUserName: message.isMatchCard ? message.suggestedUserName : undefined,
      suggestedUserCategory: message.isMatchCard ? message.suggestedUserCategory : undefined,
      status: message.isMatchCard ? (message.status || 'pending') : undefined,
      senderProfileImageUrl: message.senderProfileImageUrl || profileImageUrl,
      relatedUserId: this.getRelatedUserId(message),
      images: message.images || [],
    });
  }

  private getMessageId(id?: string): Types.ObjectId {
    return id ? this.toObjectId(id) : new Types.ObjectId();
  }

  private getMessageDate(createdAt?: string): string {
    return createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  }

  private getReadByList(readBy: string[], userId?: string): Types.ObjectId[] {
    const combined = [...new Set([...readBy, ...(userId ? [userId] : [])])];
    return combined.map(id => this.toObjectId(id));
  }

  private getRelatedUserId(message: Message): Types.ObjectId | undefined {
    return (message.isMatchCard || message.isSuggested) && message.relatedUserId 
      ? this.toObjectId(message.relatedUserId)
      : undefined;
  }

  async findByChatId(chatId: string, page: number = 1, limit: number = 20): Promise<Message[]> {
    this.validateObjectId(chatId);
    
    const [messages, botMessages] = await Promise.all([
      this.fetchNormalMessages(chatId),
      this.fetchBotMessages(chatId)
    ]);

    return this.mergeAndSortMessages(messages, botMessages);
  }

  private async fetchNormalMessages(chatId: string): Promise<Message[]> {
    const messages = await this.executeQuery(
      MessageModel.find({ chat: this.toObjectId(chatId) })
        .sort({ createdAt: -1 })
        .lean()
        .exec() as Promise<IMessageModel[]>
    );
    return messages.map(this.toDomain);
  }

  private async fetchBotMessages(chatId: string): Promise<Message[]> {
    const botMessages = await this.executeQuery(
      BotMessageModel.find({ chatId: this.toObjectId(chatId) })
        .sort({ createdAt: -1 })
        .lean()
        .exec() as Promise<IBotMessageModel[]>
    );
    return botMessages.map(msg => this.convertBotMessageToDomain(msg));
  }

  private mergeAndSortMessages(messages: Message[], botMessages: Message[]): Message[] {
    return [...messages, ...botMessages]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    this.validateObjectIds(messageId, userId);
    
    const userObjectId = this.toObjectId(userId);
    await this.updateMessageReadStatus(messageId, userObjectId) || 
      await this.updateBotMessageReadStatus(messageId, userObjectId);
  }

  private async updateMessageReadStatus(messageId: string, userId: Types.ObjectId): Promise<boolean> {
    const result = await this.executeQuery(
      MessageModel.findByIdAndUpdate(
        this.toObjectId(messageId),
        { $addToSet: { readBy: userId } },
        { new: true }
      ).exec()
    );
    return !!result;
  }

  private async updateBotMessageReadStatus(messageId: string, userId: Types.ObjectId): Promise<void> {
    await this.executeQuery(
      BotMessageModel.findByIdAndUpdate(
        this.toObjectId(messageId),
        { $addToSet: { readBy: userId } },
        { new: true }
      ).exec()
    );
  }

  async updateReadByForChat(chatId: string, userId: string): Promise<void> {
    this.validateObjectIds(chatId, userId);

    const userObjectId = this.toObjectId(userId);
    await Promise.all([
      this.updateNormalMessagesReadStatus(chatId, userObjectId),
      this.updateBotMessagesReadStatus(chatId, userObjectId)
    ]);
  }

  private async updateNormalMessagesReadStatus(chatId: string, userId: Types.ObjectId): Promise<void> {
    await this.executeQuery(
      MessageModel.updateMany(
        { chat: this.toObjectId(chatId) },
        { $addToSet: { readBy: userId } }
      ).exec()
    );
  }

  private async updateBotMessagesReadStatus(chatId: string, userId: Types.ObjectId): Promise<void> {
    await this.executeQuery(
      BotMessageModel.updateMany(
        { chatId: this.toObjectId(chatId) },
        { $addToSet: { readBy: userId } }
      ).exec()
    );
  }

  private validateObjectIds(...ids: string[]): void {
    ids.forEach(id => this.validateObjectId(id));
  }
  
  async generateId(): Promise<string> {
    return new Types.ObjectId().toString();
  }
}
