import mongoose from 'mongoose';
import { IBlacklistRepository } from '/Users/lubna/Desktop/comy_back_new/comy_api/src/chat/domain/repo/IBlacklistRepository';

const blacklistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blacklistedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

export class MongoBlacklistRepository implements IBlacklistRepository {
  async addToBlacklist(userId: string, blacklistedUserId: string): Promise<void> {
    await Blacklist.create({
      userId: new mongoose.Types.ObjectId(userId),
      blacklistedUserId: new mongoose.Types.ObjectId(blacklistedUserId)
    });
  }

  async getBlacklistedUsers(userId: string): Promise<string[]> {
    const blacklisted = await Blacklist.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).select('blacklistedUserId');
    return blacklisted.map(entry => entry.blacklistedUserId.toString());
  }

  async isBlacklisted(userId: string, blacklistedUserId: string): Promise<boolean> {
    const exists = await Blacklist.exists({
      userId: new mongoose.Types.ObjectId(userId),
      blacklistedUserId: new mongoose.Types.ObjectId(blacklistedUserId)
    });
    return !!exists;
  }
}