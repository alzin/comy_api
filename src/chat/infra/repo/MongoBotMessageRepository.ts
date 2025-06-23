import { Types } from 'mongoose';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { UserDocument } from '../../../infra/database/models/UserModel';
import { BaseRepository } from '../repositories/base.repository';
import { toBotMessageDomain } from '../mappers/BotMessageMapper';
import { toObjectId } from '../utils/mongoUtils';

export class MongoBotMessageRepository extends BaseRepository<IBotMessageModel> implements IBotMessageRepository {
  constructor() {
    super(BotMessageModel);
  }

  private validateMultipleObjectIds(ids: { id: string; field: string }[]): void {
    ids.forEach(({ id, field }) => this.validateObjectId(id, field));
  }

  private prepareBotMessageDoc(botMessage: BotMessage): Partial<IBotMessageModel> {
    return {
      _id: botMessage.id ? toObjectId(botMessage.id) : new Types.ObjectId(),
      senderId: botMessage.senderId,
      content: botMessage.content,
      chatId: toObjectId(botMessage.chatId),
      createdAt: botMessage.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: botMessage.readBy.map(id => toObjectId(id)),
      recipientId: botMessage.recipientId,
      suggestedUser: botMessage.suggestedUser ? toObjectId(botMessage.suggestedUser._id) : undefined,
      suggestionReason: botMessage.suggestionReason,
      status: botMessage.status || 'pending',
      isMatchCard: botMessage.isMatchCard || false,
      isSuggested: botMessage.isSuggested || false,
      suggestedUserProfileImageUrl: botMessage.suggestedUserProfileImageUrl,
      suggestedUserName: botMessage.suggestedUserName,
      suggestedUserCategory: botMessage.suggestedUserCategory,
      senderProfileImageUrl: botMessage.senderProfileImageUrl,
      relatedUserId: botMessage.relatedUserId,
      images: botMessage.images || [],
    };
  }

  private async populateMessageDoc<T extends IBotMessageModel | null>(
    doc: T,
    fields: string = '_id name profileImageUrl category'
  ): Promise<T> {
    if (!doc) return doc;
    return (await BotMessageModel.populate(doc, { path: 'suggestedUser', select: fields })) as T;
  }

  generateId(): string {
    return super.generateId() as string;
  }

  async create(botMessage: BotMessage): Promise<BotMessage> {
    this.validateMultipleObjectIds([
      { id: botMessage.senderId, field: 'senderId' },
      { id: botMessage.chatId, field: 'chatId' },
      ...(botMessage.recipientId ? [{ id: botMessage.recipientId, field: 'recipientId' }] : []),
      ...(botMessage.suggestedUser ? [{ id: botMessage.suggestedUser._id, field: 'suggestedUser._id' }] : []),
    ]);

    const messageDoc = new BotMessageModel(this.prepareBotMessageDoc(botMessage));
    const savedDoc = await this.runQuery<IBotMessageModel>(messageDoc.save());
    const populatedDoc = await this.populateMessageDoc(savedDoc) as IBotMessageModel & { suggestedUser?: UserDocument };

    return toBotMessageDomain(populatedDoc, populatedDoc.suggestedUser);
  }

  protected async runQuery<T>(query: Promise<T>): Promise<T> {
    return query;
  }

  async findByIdWithSuggestedUser(messageId: string): Promise<BotMessage | null> {
    this.validateObjectId(messageId, 'messageId');

    const messageDoc = await this.runQuery<IBotMessageModel | null>(
      BotMessageModel.findById(messageId).exec()
    );
    const populatedDoc = await this.populateMessageDoc(messageDoc);

    if (!populatedDoc) return null;

    return toBotMessageDomain(populatedDoc, populatedDoc.suggestedUser as unknown as UserDocument);
  }

  async findById(id: string): Promise<BotMessage | null> {
    this.validateObjectId(id, 'id');

    const messageDoc = await this.runQuery<IBotMessageModel | null>(
      BotMessageModel.findById(id).exec()
    );
    const populatedDoc = await this.populateMessageDoc(messageDoc, '_id');

    if (!populatedDoc) return null;

    return toBotMessageDomain(populatedDoc, populatedDoc.suggestedUser as unknown as UserDocument);
  }

  async updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    this.validateObjectId(id, 'id');

    const result = await this.runQuery<IBotMessageModel | null>(
      BotMessageModel.findByIdAndUpdate(id, { status }, { new: true }).exec()
    );

    if (!result) {
      throw new Error(`Bot message with ID ${id} not found`);
    }
  }

  async updateReadBy(chatId: string, userId: string): Promise<void> {
    this.validateMultipleObjectIds([
      { id: chatId, field: 'chatId' },
      { id: userId, field: 'userId' },
    ]);

    await this.runQuery(
      BotMessageModel.updateMany(
        { chatId: toObjectId(chatId) },
        { $addToSet: { readBy: toObjectId(userId) } }
      ).exec()
    );
  }

  async findExistingSuggestion(
    chatId: string,
    senderId: string,
    recipientId: string,
    suggestedUserId: string
  ): Promise<BotMessage | null> {
    this.validateMultipleObjectIds([
      { id: chatId, field: 'chatId' },
      { id: senderId, field: 'senderId' },
      { id: recipientId, field: 'recipientId' },
      { id: suggestedUserId, field: 'suggestedUserId' },
    ]);

    const messageDoc = await this.runQuery<IBotMessageModel | null>(
      BotMessageModel.findOne({
        chatId: toObjectId(chatId),
        senderId: toObjectId(senderId),
        recipientId: toObjectId(recipientId),
        suggestedUser: toObjectId(suggestedUserId),
        status: 'pending',
      }).exec()
    );
    const populatedDoc = await this.populateMessageDoc(messageDoc);

    if (!populatedDoc) return null;

    return toBotMessageDomain(populatedDoc, populatedDoc.suggestedUser as unknown as UserDocument);
  }

  async createAsync(botMessage: BotMessage): Promise<BotMessage> {
    return this.create(botMessage);
  }

  async updateStatus(messageId: string, status: string): Promise<void> {
    if (status !== 'accepted' && status !== 'rejected') {
      throw new Error('Invalid status value');
    }
    await this.updateSuggestionStatus(messageId, status as 'accepted' | 'rejected');
  }
}