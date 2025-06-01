// File: src/chat/infra/repo/MongoSuggestedPairRepository.ts
import mongoose from 'mongoose';
import SuggestedPairModel, { ISuggestedPair } from '../database/models/SuggestedPairModel';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';

export class MongoSuggestedPairRepository implements ISuggestedPairRepository {
  private isValidObjectId(id: string): boolean {
    return mongoose.isValidObjectId(id);
  }

  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string> {
    if (!this.isValidObjectId(suggestion.userId) || !this.isValidObjectId(suggestion.suggestedUserId)) {
      console.error(`Invalid ObjectId: userId=${suggestion.userId}, suggestedUserId=${suggestion.suggestedUserId}`);
      throw new Error('Invalid userId or suggestedUserId');
    }

    const created = await SuggestedPairModel.create({
      userId: new mongoose.Types.ObjectId(suggestion.userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestion.suggestedUserId),
      status: suggestion.status,
      createdAt: new Date(),
    });
    return created._id.toString();
  }

  async findByIds(userId: string, suggestedUserId: string): Promise<ISuggestedPair | null> {
    if (!this.isValidObjectId(userId) || !this.isValidObjectId(suggestedUserId)) {
      console.error(`Invalid ObjectId in findByIds: userId=${userId}, suggestedUserId=${suggestedUserId}`);
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
    // Removed invalid ObjectId filtering, as userId and suggestedUserId are guaranteed to be ObjectIds in the schema
  }

  async updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void> {
    if (!this.isValidObjectId(id)) {
      console.error(`Invalid ObjectId in updateStatus: id=${id}`);
      throw new Error('Invalid pair ID');
    }
    await SuggestedPairModel.findByIdAndUpdate(id, { status }).exec();
  }
}