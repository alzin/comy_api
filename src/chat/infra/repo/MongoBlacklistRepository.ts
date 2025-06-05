///src/chat/infra/repo/MongoBlacklistRepository.ts
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { BlacklistModel } from '../database/models/BlacklistModel';

export class MongoBlacklistRepository implements IBlacklistRepository {
  add(userId: string, suggestedUserId: string) {
      throw new Error('Method not implemented.');
  }
  async addToBlacklist(userId: string, blacklistedUserId: string): Promise<void> {
    await BlacklistModel.create({
      userId,
      blockedUserId: blacklistedUserId,
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