//src/chat/domain/repo/IFriendRepository.ts
import { Friend } from '../../infra/database/models/FriendModel';

export interface IFriendRepository {
  addFriend(userId: string, friendId: string): Promise<void>;
  getFriends(userId: string): Promise<Friend[]>;
  isFriend(userId: string, friendId: string): Promise<boolean>;
}