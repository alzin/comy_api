// src/chat/domain/repo/IFriendRepository.ts
import { Friend } from '../entities/Friend';

export interface IFriendRepository {
  addFriend(userId: string, friendId: string): Promise<void>;
  getFriends(userId: string): Promise<Friend[]>;
  isFriend(userId: string, friendId: string): Promise<boolean>;
}