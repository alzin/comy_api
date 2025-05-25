///src/chat/infra/repo/MongoBlacklistRepository.ts
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { BlacklistModel } from '../database/models/models/BlacklistModel';

export class MongoBlacklistRepository implements IBlacklistRepository {
  async addToBlacklist(userId: string, blacklistedUserId: string): Promise<void> {
    await BlacklistModel.create({
      userId,
      blockedUserId: blacklistedUserId,
      blockDuration: 7 
    });
  }

  async getBlacklistedUsers(userId: string): Promise<string[]> {
    const blacklisted = await BlacklistModel.find({ userId }).select('blockedUserId');
    return blacklisted.map(entry => entry.blockedUserId.toString());
  }

  async isBlacklisted(userId: string, blockedUserId: string): Promise<boolean> {
    const entry = await BlacklistModel.findOne({ userId, blockedUserId });
    return !!entry; 
  }
}