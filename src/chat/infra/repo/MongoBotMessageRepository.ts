// src/chat/infra/repo/MongoBotMessageRepository.ts
import mongoose, { Types } from 'mongoose';
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import BotMessageModel, { IBotMessageModel } from '../database/models/BotMessageModel';
import { UserDocument } from '../../../infra/database/models/UserModel';
import { BaseRepository } from '../repositories/base.repository';

export class MongoBotMessageRepository extends BaseRepository<IBotMessageModel> implements IBotMessageRepository {
  constructor() {
    super(BotMessageModel);
  }

  generateId(): string {
  return super.generateId() as string;
}

  private toDomain(messageDoc: IBotMessageModel, suggestedUser?: UserDocument): BotMessage {
    return {
      id: messageDoc._id.toString(),
      senderId: messageDoc.senderId.toString(),
      content: messageDoc.content || '',
      chatId: messageDoc.chatId.toString(),
      createdAt: messageDoc.createdAt.toString(),
      readBy: messageDoc.readBy.map((id: Types.ObjectId) => id.toString()),
      recipientId: messageDoc.recipientId?.toString(),
      suggestedUser: suggestedUser ? {
        _id: suggestedUser._id.toString(),
        name: messageDoc.suggestedUserName || suggestedUser.name || '',
        profileImageUrl: messageDoc.suggestedUserProfileImageUrl || suggestedUser.profileImageUrl || '',
        category: messageDoc.suggestedUserCategory || suggestedUser.category || '',
      } : undefined,
      suggestionReason: messageDoc.suggestionReason,
      status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
      isMatchCard: messageDoc.isMatchCard || false,
      isSuggested: messageDoc.isSuggested || false,
      suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
      suggestedUserName: messageDoc.suggestedUserName,
      suggestedUserCategory: messageDoc.suggestedUserCategory,
      senderProfileImageUrl: messageDoc.senderProfileImageUrl,
      relatedUserId: messageDoc.relatedUserId || (suggestedUser ? suggestedUser._id.toString() : undefined),
      images: messageDoc.images || [],
    };
  }

  async create(botMessage: BotMessage): Promise<BotMessage> {
    this.validateObjectId(botMessage.senderId, 'senderId');
    this.validateObjectId(botMessage.chatId, 'chatId');
    
    if (botMessage.recipientId) this.validateObjectId(botMessage.recipientId, 'recipientId');
    if (botMessage.suggestedUser) this.validateObjectId(botMessage.suggestedUser._id, 'suggestedUser._id');

    const messageDoc = new BotMessageModel({
      _id: botMessage.id ? this.toObjectId(botMessage.id) : new Types.ObjectId(),
      senderId: this.toObjectId(botMessage.senderId),
      content: botMessage.content,
      chatId: this.toObjectId(botMessage.chatId),
      createdAt: botMessage.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: botMessage.readBy.map(id => this.toObjectId(id)),
      recipientId: botMessage.recipientId ? this.toObjectId(botMessage.recipientId) : undefined,
      suggestedUser: botMessage.suggestedUser ? this.toObjectId(botMessage.suggestedUser._id) : undefined,
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
    });

    const savedDoc = await this.executeQuery<IBotMessageModel>(messageDoc.save());
    const populatedDoc = await BotMessageModel.populate(savedDoc, {
      path: 'suggestedUser',
      select: '_id name profileImageUrl category'
    });
    
    return this.toDomain(
      populatedDoc,
      populatedDoc.suggestedUser as unknown as UserDocument
    );
  }

  async findByIdWithSuggestedUser(messageId: string): Promise<BotMessage | null> {
    this.validateObjectId(messageId);

    const messageDoc = await this.executeQuery<IBotMessageModel | null>(
      BotMessageModel.findById(messageId)
        .populate('suggestedUser', '_id name profileImageUrl category')
        .exec()
    );

    if (!messageDoc) return null;

    return this.toDomain(
      messageDoc,
      messageDoc.suggestedUser as unknown as UserDocument
    );
  }

  async findById(id: string): Promise<BotMessage | null> {
    this.validateObjectId(id);

    const messageDoc = await this.executeQuery<IBotMessageModel | null>(
      BotMessageModel.findById(id)
        .populate('suggestedUser', '_id')
        .exec()
    );

    if (!messageDoc) return null;

    return this.toDomain(
      messageDoc,
      messageDoc.suggestedUser as unknown as UserDocument
    );
  }

  async updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    this.validateObjectId(id);

    const result = await this.executeQuery<IBotMessageModel | null>(
      BotMessageModel.findByIdAndUpdate(id, { status }, { new: true }).exec()
    );

    if (!result) {
      throw new Error(`Bot message with ID ${id} not found`);
    }
  }

  async updateReadBy(chatId: string, userId: string): Promise<void> {
    this.validateObjectId(chatId);
    this.validateObjectId(userId);

    await this.executeQuery<void>(
      BotMessageModel.updateMany(
        { chatId: this.toObjectId(chatId) },
        { $addToSet: { readBy: this.toObjectId(userId) } }
      ).exec() as Promise<any>
    );
  }

  async findExistingSuggestion(
    chatId: string,
    senderId: string,
    recipientId: string,
    suggestedUserId: string
  ): Promise<BotMessage | null> {
    this.validateObjectId(chatId);
    this.validateObjectId(senderId);
    this.validateObjectId(recipientId);
    this.validateObjectId(suggestedUserId);

    const messageDoc = await this.executeQuery<IBotMessageModel | null>(
      BotMessageModel.findOne({
        chatId: this.toObjectId(chatId),
        senderId: this.toObjectId(senderId),
        recipientId: this.toObjectId(recipientId),
        suggestedUser: this.toObjectId(suggestedUserId),
        status: 'pending',
      })
      .populate('suggestedUser', '_id name profileImageUrl category')
      .exec()
    );

    if (!messageDoc) return null;

    return this.toDomain(
      messageDoc,
      messageDoc.suggestedUser as unknown as UserDocument
    );
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