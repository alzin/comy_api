import mongoose from 'mongoose';
import { IBotMessageRepository } from '../../domain/repo/IBotMessageRepository';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { BotMessageModel, IBotMessageModel } from '../../../chat/infra/database/models/models/BotMessageModel';

export class MongoBotMessageRepository implements IBotMessageRepository {
  private mapToDomain(doc: IBotMessageModel): BotMessage {
    const populatedSender = (doc as any).senderId;
    return {
      id: doc._id.toString(),
      chatId: doc.chatId.toString(),
      senderId: doc.senderId.toString(),
      recipientId: doc.recipientId.toString(),
      suggestedUser: doc.suggestedUser?.toString(),
      suggestionReason: doc.suggestionReason,
      status: doc.status,
      content: doc.content,
      createdAt: doc.createdAt,
      readBy: doc.readBy.map(id => id.toString()),
      sender: populatedSender && populatedSender.name && populatedSender.email
        ? { name: populatedSender.name, email: populatedSender.email }
        : undefined,
      isMatchCard: doc.isMatchCard || doc.suggestionReason === 'Random' || doc.suggestionReason === 'Match request',
      suggestedUserProfileImageUrl: doc.suggestedUserProfileImageUrl
    };
  }

  async create(message: BotMessage): Promise<void> {
    const isMatchCard = message.suggestionReason === 'Random' || message.suggestionReason === 'Match request';
    const newMessage = new BotMessageModel({
      ...message,
      chatId: new mongoose.Types.ObjectId(message.chatId),
      senderId: new mongoose.Types.ObjectId(message.senderId),
      recipientId: new mongoose.Types.ObjectId(message.recipientId),
      suggestedUser: message.suggestedUser ? new mongoose.Types.ObjectId(message.suggestedUser) : undefined,
      readBy: message.readBy?.map(id => new mongoose.Types.ObjectId(id)) || [],
      isMatchCard: message.isMatchCard !== undefined ? message.isMatchCard : isMatchCard,
      suggestedUserProfileImageUrl: message.suggestedUserProfileImageUrl
    });
    await newMessage.save();
  }

  async findByUserAndStatus(userId: string, statuses: string[]): Promise<BotMessage | null> {
    const doc = await BotMessageModel.findOne({
      recipientId: userId,
      status: { $in: statuses }
    })
      .populate('senderId', 'name email')
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async updateSuggestionStatus(messageId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await BotMessageModel.findByIdAndUpdate(messageId, { status }, { new: true }).exec();
  }

  async findByChatId(chatId: string): Promise<BotMessage[]> {
    const docs = await BotMessageModel.find({ chatId })
      .populate('senderId', 'name email')
      .exec();
    return docs.map(doc => this.mapToDomain(doc));
  }
}