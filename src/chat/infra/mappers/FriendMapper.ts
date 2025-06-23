import { Friend } from '../../domain/entities/Friend';
import { Friend as IFriendMongoose } from '../database/models/FriendModel';

export function toFriendDomain(doc: IFriendMongoose): Friend {
  return {
    userId: doc.userId.toString(),
    friendId: doc.friendId.toString(),
    createdAt: doc.createdAt.toISOString(),
  };
}