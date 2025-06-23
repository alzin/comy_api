import { Types } from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import MessageModel, { IMessageModel } from '../database/models/MessageModel';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { BaseRepository } from '../repositories/base.repository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { CONFIG } from '../../../main/config/config';
import { toMessageDomain, toBotMessageDomain } from '../mappers/MessageMapper';
import { toObjectId } from '../utils/mongoUtils';

type SenderDetails = {
  name: string;
  profileImageUrl: string;
};

export class MongoMessageRepository extends BaseRepository<IMessageModel> implements IMessageRepository {
  constructor(
    private userRepository: IUserRepository,
    private chatRepository: IChatRepository,
  ) {
    super(MessageModel);
  }

  private validateMultipleObjectIds(ids: { id: string; field?: string }[]): void {
    ids.forEach(({ id, field }) => this.validateObjectId(id, field));
  }

  private prepareReadBy(readBy: string[], userId?: string): Types.ObjectId[] {
    const combined = [...new Set([...readBy, ...(userId ? [userId] : [])])];
    return combined.map(id => toObjectId(id));
  }

  private async updateReadByForModel(model: any, idField: string, idValue: string, userId: Types.ObjectId): Promise<boolean> {
    const result = await this.runQuery(
      model.findOneAndUpdate(
        { [idField]: toObjectId(idValue) },
        { $addToSet: { readBy: userId } },
        { new: true },
      ).exec(),
    );
    return !!result;
  }

  private async getSenderDetails(senderId: string): Promise<SenderDetails> {
    if (senderId === CONFIG.BOT_ID || senderId === CONFIG.ADMIN) {
      return {
        name: 'COMY オフィシャル AI',
        profileImageUrl: CONFIG.BOT_IMAGE_URL,
      };
    }
    const user = await this.userRepository.findById(senderId);
    return {
      name: user?.name || 'Unknown User',
      profileImageUrl: user?.profileImageUrl || '',
    };
  }

  private prepareMessageDoc(message: Message, senderName: string, profileImageUrl: string, userId?: string): Partial<IMessageModel> {
    return {
      _id: message.id ? toObjectId(message.id) : new Types.ObjectId(),
      senderId: message.senderId,
      senderName,
      content: message.content,
      chat: toObjectId(message.chatId),
      createdAt: message.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: this.prepareReadBy(message.readBy, userId),
      isMatchCard: message.isMatchCard || false,
      isSuggested: message.isSuggested || false,
      suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl,
      suggestedUserName: message.isMatchCard ? message.suggestedUserName : undefined,
      suggestedUserCategory: message.isMatchCard ? message.suggestedUserCategory : undefined,
      status: message.isMatchCard ? (message.status || 'pending') : undefined,
      senderProfileImageUrl: message.senderProfileImageUrl || profileImageUrl,
      relatedUserId: (message.isMatchCard || message.isSuggested) && message.relatedUserId ? message.relatedUserId : undefined,
      images: message.images || [],
    };
  }

  async generateId(): Promise<string> {
    return new Types.ObjectId().toString();
  }

  async create(message: Message, userId?: string): Promise<Message> {
    this.validateMultipleObjectIds([
      { id: message.chatId, field: 'chatId' },
      { id: message.senderId, field: 'senderId' },
      ...(userId ? [{ id: userId, field: 'userId' }] : []),
    ]);

    const { name, profileImageUrl } = await this.getSenderDetails(message.senderId);
    const messageDoc = new MessageModel(this.prepareMessageDoc(message, name, profileImageUrl, userId));
    const savedDoc = await this.runQuery(messageDoc.save());

    return toMessageDomain(savedDoc);
  }

  async findByChatId(chatId: string, page: number = 1, limit: number = 20): Promise<Message[]> {
    this.validateMultipleObjectIds([{ id: chatId, field: 'chatId' }]);

    const [messages, botMessages] = await Promise.all([
      this.runQuery(
        MessageModel.find({ chat: toObjectId(chatId) })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
      ).then(msgs => (msgs as IMessageModel[]).map(toMessageDomain)),
      this.runQuery(
        BotMessageModel.find({ chatId: toObjectId(chatId) })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
      ).then(msgs => (msgs as IBotMessageModel[]).map(toBotMessageDomain)),
    ]);

    return [...messages, ...botMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateReadBy(messageId: string, userId: string): Promise<void> {
    this.validateMultipleObjectIds([
      { id: messageId, field: 'messageId' },
      { id: userId, field: 'userId' },
    ]);

    const userObjectId = toObjectId(userId);
    const updated = await this.updateReadByForModel(MessageModel, '_id', messageId, userObjectId);
    if (!updated) {
      await this.updateReadByForModel(BotMessageModel, '_id', messageId, userObjectId);
    }
  }

  async updateReadByForChat(chatId: string, userId: string): Promise<void> {
    this.validateMultipleObjectIds([
      { id: chatId, field: 'chatId' },
      { id: userId, field: 'userId' },
    ]);

    const userObjectId = toObjectId(userId);
    await Promise.all([
      this.runQuery(
        MessageModel.updateMany(
          { chat: toObjectId(chatId) },
          { $addToSet: { readBy: userObjectId } },
        ).exec(),
      ),
      this.runQuery(
        BotMessageModel.updateMany(
          { chatId: toObjectId(chatId) },
          { $addToSet: { readBy: userObjectId } },
        ).exec(),
      ),
    ]);
  }

  protected async runQuery<T>(query: Promise<T>): Promise<T> {
    return query;
  }
}