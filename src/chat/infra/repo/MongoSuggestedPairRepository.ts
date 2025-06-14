import mongoose from 'mongoose';
import { SuggestedPairModel } from '../database/models/SuggestedPairModel';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { SuggestedPair } from '../../domain/entities/SuggestedPair';
import { ISuggestedPairMongoose } from '../database/models/SuggestedPairModel';

export class MongoSuggestedPairRepository implements ISuggestedPairRepository {
  private toDomain(pair: ISuggestedPairMongoose): SuggestedPair {
    return {
      _id: pair._id.toString(),
      userId: pair.userId.toString(),
      suggestedUserId: pair.suggestedUserId.toString(),
      status: pair.status,
      matchType: pair.matchType,
      similarity: pair.similarity,
      reason: pair.reason,
      matchedTextA: pair.matchedTextA,
      matchedTextB: pair.matchedTextB,
      createdAt: pair.createdAt,
    };
  }

  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' }): Promise<string> {
    if (!mongoose.Types.ObjectId.isValid(suggestion.userId) || !mongoose.Types.ObjectId.isValid(suggestion.suggestedUserId)) {
      throw new Error('Invalid userId or suggestedUserId');
    }
    const created = await SuggestedPairModel.create({
      userId: new mongoose.Types.ObjectId(suggestion.userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestion.suggestedUserId),
      status: suggestion.status,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    });
    return created._id.toString();
  }

  async findByIds(userId: string, suggestedUserId: string): Promise<SuggestedPair | null> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(suggestedUserId)) {
      return null;
    }
    const pair = await SuggestedPairModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestedUserId),
      status: { $in: ['pending', 'sent'] },
    }).exec();
    return pair ? this.toDomain(pair) : null;
  }

  async findPending(validateIds: boolean = false): Promise<SuggestedPair[]> {
    let pairs = await SuggestedPairModel.find({ status: 'pending' }).exec();
    if (validateIds) {
      pairs = pairs.filter(pair => mongoose.Types.ObjectId.isValid(pair.userId) && mongoose.Types.ObjectId.isValid(pair.suggestedUserId));
    }
    return pairs.map(pair => this.toDomain(pair));
  }

  async findPendingWithValidIds(): Promise<SuggestedPair[]> {
    return this.findPending(true);
  }

  async updateStatus(id: string, status: 'pending' | 'sent'): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid pair ID');
    }
    await SuggestedPairModel.findByIdAndUpdate(id, { status }).exec();
  }
}