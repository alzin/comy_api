// File: src/chat/application/use-cases/SuggestFriendsUseCase.ts
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IBotMessageRepository } from '../../domain/repo/IBotMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository'; // New
import { CreateChatUseCase } from './CreateChatUseCase';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';
import { ISocketService } from '../../domain/services/ISocketService'; // New

export class SuggestFriendsUseCase {
  private virtualUserId: string;

  constructor(
    private userRepository: IUserRepository,
    private botMessageRepository: IBotMessageRepository, // Not used in new logic but kept for compatibility
    private chatRepository: IChatRepository,
    private blacklistRepository: IBlacklistRepository,
    private friendRepository: IFriendRepository,
    private createChatUseCase: CreateChatUseCase,
    private socketService: ISocketService, // Added
    private suggestedPairRepository: ISuggestedPairRepository, // New
    virtualUserId: string // Added
  ) {
    this.virtualUserId = virtualUserId;
  }

  private shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async execute(): Promise<void> {
    console.log('Starting friend suggestion process...');

    try {
      const activeUsers = await this.userRepository.findActiveUsers();
      console.log(`Found ${activeUsers.length} active users`);

      const validUsers = activeUsers.filter(u => u.id && u.subscriptionStatus === SubscriptionStatus.Active);
      console.log(`Found ${validUsers.length} valid active users`);

      if (validUsers.length < 2) {
        console.log('Not enough valid active users to make suggestions');
        return;
      }

      const shuffledUsers = this.shuffle([...validUsers]);
      const suggestedPairs = new Set<string>();
      let suggestionCount = 0;

      const createSuggestion = async (user: User, suggestedUser: User) => {
        const pairKey = `${user.id}-${suggestedUser.id}`;
        if (suggestedPairs.has(pairKey)) return;
        suggestedPairs.add(pairKey);
        suggestionCount++;

        console.log(`Suggesting user: ${suggestedUser.name} (ID: ${suggestedUser.id}) to ${user.name} (ID: ${user.id})`);

        let chat = await this.chatRepository.findByUsers([user.id!, this.virtualUserId]);
        if (!chat) {
          console.log(`Creating new private chat for user ${user.id} with virtual user`);
          chat = await this.createChatUseCase.execute(
            [user.id!, this.virtualUserId],
            'Private Chat with Virtual Assistant',
            false
          );
          console.log(`Created chat with ID: ${chat.id}`);
        }

        if (!chat.id) {
          console.error(`Chat ID is null for user ${user.id}`);
          return;
        }

        const existingPair = await this.suggestedPairRepository.findByIds(user.id!, suggestedUser.id!);
        if (existingPair) {
          console.log(`Duplicate suggestion found for user ${user.id} suggesting ${suggestedUser.id}, skipping...`);
          return;
        }

        await this.suggestedPairRepository.create({
          userId: user.id!,
          suggestedUserId: suggestedUser.id!,
          status: 'pending',
        });
        console.log(`Stored suggestion for user ${user.id} suggesting ${suggestedUser.id}`);
      };

      for (const user of validUsers) {
        if (!user.id || user.id === this.virtualUserId) {
          console.log(`Skipping user with ID ${user.id} (invalid or virtual user)`);
          continue;
        }

        console.log(`Processing suggestion for ${user.name} (ID: ${user.id})`);

        const blacklistedUserIds = await this.blacklistRepository.getBlacklistedUsers(user.id);
        const friendUserIds = (await this.friendRepository.getFriends(user.id)).map(f => f.friendId.toString());
        console.log(`Blacklisted users for ${user.name}:`, blacklistedUserIds);
        console.log(`Existing friends for ${user.name}:`, friendUserIds);

        const possibleSuggestions = validUsers.filter(u =>
          u.id && u.id !== user.id && u.id !== this.virtualUserId &&
          !blacklistedUserIds.includes(u.id) && !friendUserIds.includes(u.id)
        );

        if (possibleSuggestions.length === 0) {
          console.log(`No possible suggestions for ${user.name} (ID: ${user.id})`);
          const fallbackSuggestions = validUsers.filter(u =>
            u.id && u.id !== user.id && u.id !== this.virtualUserId &&
            !blacklistedUserIds.includes(u.id) && !friendUserIds.includes(u.id)
          );
          if (fallbackSuggestions.length === 0) {
            console.log(`No fallback suggestions available for ${user.name}`);
            continue;
          }
          const shuffledFallback = this.shuffle([...fallbackSuggestions]);
          const suggestedUser = shuffledFallback[0];
          const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
          if (!suggestedUserExists) {
            console.log(`Suggested user ${suggestedUser.id} does not exist, skipping...`);
            continue;
          }
          await createSuggestion(user, suggestedUser as User);
          continue;
        }

        const shuffledSuggestions = this.shuffle([...possibleSuggestions]);
        const suggestedUser = shuffledSuggestions[0];
        const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
        if (!suggestedUserExists) {
          console.log(`Suggested user ${suggestedUser.id} does not exist, skipping...`);
          continue;
        }
        await createSuggestion(user, suggestedUser as User);
      }

      console.log(`Friend suggestion process completed. Total suggestions stored: ${suggestionCount}`);
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }
}