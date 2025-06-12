import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { Friend } from '../../domain/entities/Friend'; 
import { FriendModel } from '../database/models/FriendModel';
import mongoose from 'mongoose';

export class MongoFriendRepository implements IFriendRepository {
  async addFriend(userId: string, friendId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
      throw new Error('Invalid userId or friendId');
    }
    await FriendModel.create([
      { userId: new mongoose.Types.ObjectId(userId), friendId: new mongoose.Types.ObjectId(friendId), createdAt: new Date() },
      { userId: new mongoose.Types.ObjectId(friendId), friendId: new mongoose.Types.ObjectId(userId), createdAt: new Date() },
    ]);
  }

  async getFriends(userId: string): Promise<Friend[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }
    const friendDocs = await FriendModel.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().exec();
    return friendDocs.map(doc => ({
      userId: doc.userId.toString(),
      friendId: doc.friendId.toString(),
      createdAt: doc.createdAt.toISOString(),
    }));
  }

  async isFriend(userId: string, friendId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
      return false;
    }
    const friendDoc = await FriendModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      friendId: new mongoose.Types.ObjectId(friendId),
    }).exec();
    return !!friendDoc;
  }
}