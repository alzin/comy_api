import mongoose from 'mongoose';
import SuggestedPairModel, { ISuggestedPair } from '../database/models/SuggestedPairModel';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';

export class MongoSuggestedPairRepository implements ISuggestedPairRepository {
  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string> {
    if (!mongoose.Types.ObjectId.isValid(suggestion.userId) || !mongoose.Types.ObjectId.isValid(suggestion.suggestedUserId)) {
      throw new Error('Invalid userId or suggestedUserId');
    }
    const created = await SuggestedPairModel.create({
      userId: new mongoose.Types.ObjectId(suggestion.userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestion.suggestedUserId),
      status: suggestion.status,
      createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    });
    return created._id.toString();
  }

  async findByIds(userId: string, suggestedUserId: string): Promise<ISuggestedPair | null> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(suggestedUserId)) {
      return null;
    }
    return await SuggestedPairModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestedUserId),
    }).exec();
  }

  async findPending(): Promise<ISuggestedPair[]> {
    return await SuggestedPairModel.find({ status: 'pending' })
      .populate('userId', 'name')
      .populate('suggestedUserId', 'name profileImageUrl category')
      .exec();
  }

  async findPendingWithValidIds(): Promise<ISuggestedPair[]> {
    const pairs = await SuggestedPairModel.find({ status: 'pending' })
      .populate('userId', 'name')
      .populate('suggestedUserId', 'name profileImageUrl category')
      .exec();
    return pairs.filter(pair =>
      mongoose.Types.ObjectId.isValid(pair.userId) &&
      mongoose.Types.ObjectId.isValid(pair.suggestedUserId)
    );
  }

  async updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid pair ID');
    }
    await SuggestedPairModel.findByIdAndUpdate(id, { status }).exec();
  }
}