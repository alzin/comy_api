///Users/lubna/Desktop/COMY_BACK_NEW/comy_api/src/chat/infra/repo/MongoBlacklistRepository.ts
import mongoose from 'mongoose';
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { BlacklistModel } from '../database/models/models/BlacklistModel';

export class MongoBlacklistRepository implements IBlacklistRepository {
  async addToBlacklist(userId: string, blacklistedUserId: string): Promise<void> {
    await BlacklistModel.create({
      userId,
      blockedUserId: blacklistedUserId,
      blockDuration: 7 // يتماشى مع BlacklistModel.ts
    });
  }

  async getBlacklistedUsers(userId: string): Promise<string[]> {
    const blacklisted = await BlacklistModel.find({ userId }).select('blockedUserId');
    return blacklisted.map(entry => entry.blockedUserId.toString());
  }

  async isBlacklisted(userId: string, blacklistedUserId: string): Promise<boolean> {
    const exists = await BlacklistModel.exists({
      userId,
      blockedUserId: blacklistedUserId
    });
    return !!exists;
  }
}