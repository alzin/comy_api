import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { Friend } from '../database/models/models/FriendModel';
import { FriendModel } from '../database/models/models/FriendModel';
import mongoose from 'mongoose';

// MongoDB implementation of friend repository
export class MongoFriendRepository implements IFriendRepository {
  // Add a friend (creates two records for mutual friendship)
  async addFriend(userId: string, friendId: string): Promise<void> {
    await FriendModel.create([
      { userId: new mongoose.Types.ObjectId(userId), friendId: new mongoose.Types.ObjectId(friendId) },
      { userId: new mongoose.Types.ObjectId(friendId), friendId: new mongoose.Types.ObjectId(userId) },
    ]);
  }

  // Get a user's friends
  async getFriends(userId: string): Promise<Friend[]> {
    return FriendModel.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  }

  // Check if two users are friends
  async isFriend(userId: string, friendId: string): Promise<boolean> {
    const friend = await FriendModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      friendId: new mongoose.Types.ObjectId(friendId),
    });
    return !!friend;
  }

}