// src/chat/infra/repo/MongoSuggestedPairRepository.ts
import mongoose from 'mongoose';
import { SuggestedPairModel } from '../database/models/SuggestedPairModel';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { SuggestedPair } from '../../domain/entities/SuggestedPair';

export class MongoSuggestedPairRepository implements ISuggestedPairRepository {
  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent'| 'rejected' }): Promise<string> {
    if (!mongoose.Types.ObjectId.isValid(suggestion.userId) || !mongoose.Types.ObjectId.isValid(suggestion.suggestedUserId)) {
      throw new Error('Invalid userId or suggestedUserId');
    }
    const created = await SuggestedPairModel.create({
      userId: new mongoose.Types.ObjectId(suggestion.userId),
      suggestedUserId: new mongoose.Types.ObjectId(suggestion.suggestedUserId),
      status: suggestion.status,
      createdAt: new Date().toISOString(),
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
      status: { $in: ['pending', 'sent','rejected'] },
    }).exec();
    if (!pair) return null;
    return {
      _id: pair._id.toString(),
      userId: pair.userId.toString(),
      suggestedUserId: pair.suggestedUserId.toString(),
      status: pair.status as 'pending' | 'sent'| 'rejected',
      matchType: pair.matchType,
      similarity: pair.similarity,
      reason: pair.reason,
      matchedTextA: pair.matchedTextA,
      matchedTextB: pair.matchedTextB,
      createdAt: pair.createdAt,
    };
  }

  async findPending(): Promise<SuggestedPair[]> {
    const pairs = await SuggestedPairModel.find({ status: 'pending' }).exec();
    return pairs.map(pair => ({
      _id: pair._id.toString(),
      userId: pair.userId.toString(),
      suggestedUserId: pair.suggestedUserId.toString(),
      status: pair.status as 'pending',
      matchType: pair.matchType,
      similarity: pair.similarity,
      reason: pair.reason,
      matchedTextA: pair.matchedTextA,
      matchedTextB: pair.matchedTextB,
      createdAt: pair.createdAt,
    }));
  }

  async findPendingWithValidIds(): Promise<SuggestedPair[]> {
    const pairs = await SuggestedPairModel.find({ status: 'pending' }).exec();
    return pairs
      .filter(pair => mongoose.Types.ObjectId.isValid(pair.userId) && mongoose.Types.ObjectId.isValid(pair.suggestedUserId))
      .map(pair => ({
        _id: pair._id.toString(),
        userId: pair.userId.toString(),
        suggestedUserId: pair.suggestedUserId.toString(),
        status: pair.status as 'pending',
        matchType: pair.matchType,
        similarity: pair.similarity,
        reason: pair.reason,
        matchedTextA: pair.matchedTextA,
        matchedTextB: pair.matchedTextB,
        createdAt: pair.createdAt,
      }));
  }

  async updateStatus(id: string, status: 'pending' | 'sent'| 'rejected'): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid pair ID');
    }
    await SuggestedPairModel.findByIdAndUpdate(id, { status }).exec();
  }
}