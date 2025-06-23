import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { Friend } from '../../domain/entities/Friend';
import { FriendModel, Friend as IFriendMongoose } from '../database/models/FriendModel';
import { BaseRepository } from '../repositories/base.repository';
import { formatDate } from '../utils/mongoUtils';
import { toFriendDomain } from '../mappers/FriendMapper';

export class MongoFriendRepository extends BaseRepository<IFriendMongoose> implements IFriendRepository {
  constructor() {
    super(FriendModel);
  }

  async addFriend(userId: string, friendId: string): Promise<void> {
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(friendId, 'friendId');

    await this.executeQuery(
      FriendModel.create([
        { userId: this.toObjectId(userId), friendId: this.toObjectId(friendId), createdAt: new Date(formatDate()) },
        { userId: this.toObjectId(friendId), friendId: this.toObjectId(userId), createdAt: new Date(formatDate()) },
      ]),
    );
  }

  async getFriends(userId: string): Promise<Friend[]> {
    this.validateObjectId(userId, 'userId');

    const friendDocs = await this.executeQuery(
      FriendModel.find({ userId: this.toObjectId(userId) }).lean().exec(),
    );

    return friendDocs.map(toFriendDomain);
  }

  async isFriend(userId: string, friendId: string): Promise<boolean> {
    this.validateObjectId(userId, 'userId');
    this.validateObjectId(friendId, 'friendId');

    const friendDoc = await this.executeQuery(
      FriendModel.findOne({
        userId: this.toObjectId(userId),
        friendId: this.toObjectId(friendId),
      }).exec(),
    );

    return !!friendDoc;
  }
}