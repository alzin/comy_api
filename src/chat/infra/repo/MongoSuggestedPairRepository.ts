import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { SuggestedPair } from '../../domain/entities/SuggestedPair';
import { SuggestedPairModel, ISuggestedPairMongoose } from '../database/models/SuggestedPairModel';
import { BaseRepository } from '../repositories/base.repository';
import { formatDate } from '../utils/mongoUtils';
import { toSuggestedPairDomain } from '../mappers/SuggestedPairMapper';
import mongoose from 'mongoose';

export class MongoSuggestedPairRepository extends BaseRepository<ISuggestedPairMongoose> implements ISuggestedPairRepository {
  constructor() {
    super(SuggestedPairModel);
  }

  async create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' }): Promise<string> {
    this.validateObjectId(suggestion.userId, 'userId');
    this.validateObjectId(suggestion.suggestedUserId, 'suggestedUserId');

    const created = await this.executeQuery(
      SuggestedPairModel.create({
        userId: this.toObjectId(suggestion.userId),
        suggestedUserId: this.toObjectId(suggestion.suggestedUserId),
        status: suggestion.status,
        createdAt: formatDate(),
      }),
    );

    return created._id.toString();
  }

  async findByIds(userId: string, suggestedUserId: string): Promise<SuggestedPair | null> {
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(suggestedUserId, 'suggestedUserId');

    const pair = await this.executeQuery(
      SuggestedPairModel.findOne({
        userId: this.toObjectId(userId),
        suggestedUserId: this.toObjectId(suggestedUserId),
        status: { $in: ['pending', 'sent'] },
      }).exec(),
    );

    return pair ? toSuggestedPairDomain(pair) : null;
  }

  async findPending(validateIds: boolean = false): Promise<SuggestedPair[]> {
    const pairs = await this.executeQuery(
      SuggestedPairModel.find({ status: 'pending' }).exec(),
    );

    const filteredPairs = validateIds
      ? pairs.filter(pair => mongoose.Types.ObjectId.isValid(pair.userId) && mongoose.Types.ObjectId.isValid(pair.suggestedUserId))
      : pairs;

    return filteredPairs.map(toSuggestedPairDomain);
  }

  async findPendingWithValidIds(): Promise<SuggestedPair[]> {
    return this.findPending(true);
  }

  async updateStatus(id: string, status: 'pending' | 'sent'): Promise<void> {
    this.validateObjectId(id, 'pairId');

    await this.executeQuery(
      SuggestedPairModel.findByIdAndUpdate(id, { status }).exec(),
    );
  }

  async updateStatusesBatch(pairIds: string[], status: 'pending' | 'sent'): Promise<void> {
    pairIds.forEach(id => this.validateObjectId(id, 'pairId'));

    await this.executeQuery(
      SuggestedPairModel.updateMany(
        { _id: { $in: pairIds.map(this.toObjectId) } },
        { $set: { status } },
      ).exec(),
    );
  }
}