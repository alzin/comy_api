////src/chat/application/use-cases/AddFriendUseCase.ts
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';

// Use case for adding a friend
export class AddFriendUseCase {
  constructor(
    private friendRepository: IFriendRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(userId: string, friendId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    const friend = await this.userRepository.findById(friendId);

    if (!user || !friend) {
      throw new Error('User or friend not found');
    }

    const isAlreadyFriend = await this.friendRepository.isFriend(userId, friendId);
    if (isAlreadyFriend) {
      throw new Error('Users are already friends');
    }

    await this.friendRepository.addFriend(userId, friendId);
  }
}