import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { BlacklistModel, IBlacklistModel } from '../database/models/BlacklistModel';
import { BaseRepository } from '../repositories/base.repository';
import { formatDate } from '../utils/mongoUtils';
import { toBlacklistDomain } from '../mappers/BlacklistMapper';

export class MongoBlacklistRepository extends BaseRepository<IBlacklistModel> implements IBlacklistRepository {
  constructor() {
    super(BlacklistModel);
  }

  async addToBlacklist(userId: string, blacklistedUserId: string): Promise<void> {
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(blacklistedUserId, 'blacklistedUserId');

    await this.executeQuery(
      BlacklistModel.create({
        userId: this.toObjectId(userId),
        blockedUserId: this.toObjectId(blacklistedUserId),
        createdAt: formatDate(),
      }),
    );
  }

  async getBlacklistedUsers(userId: string): Promise<string[]> {
    this.validateObjectId(userId, 'userId');

    const blacklisted = await this.executeQuery(
      BlacklistModel.find({ userId: this.toObjectId(userId) }).select('blockedUserId').lean().exec(),
    );

    return blacklisted.map(entry => toBlacklistDomain(entry.blockedUserId));
  }

  async isBlacklisted(userId: string, blacklistedUserId: string): Promise<boolean> {
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(blacklistedUserId, 'blacklistedUserId');

    const entry = await this.executeQuery(
      BlacklistModel.findOne({ userId: this.toObjectId(userId), blockedUserId: this.toObjectId(blacklistedUserId) }).exec(),
    );

    return !!entry;
  }
}