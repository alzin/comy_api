// File: src/chat/infra/repo/MongoSuggestedPairRepository.ts
import mongoose from 'mongoose';
import SuggestedPairModel, { ISuggestedPair } from '../database/models/SuggestedPairModel';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';

export class MongoSuggestedPairRepository implements ISuggestedPairRepository {
  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string> {
    const created = await SuggestedPairModel.create({
      userId: new mongoose.Types.ObjectId(suggestion.userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestion.suggestedUserId), 
      status: suggestion.status,
      createdAt: new Date(),
    });
    return created._id.toString();
  }

  async findByIds(userId: string, suggestedUserId: string): Promise<ISuggestedPair | null> {
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

  async updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void> {
    await SuggestedPairModel.findByIdAndUpdate(id, { status }).exec();
  }
}