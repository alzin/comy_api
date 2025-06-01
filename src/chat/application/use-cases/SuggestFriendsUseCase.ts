// File: src/chat/application/use-cases/SuggestFriendsUseCase.ts
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IBotMessageRepository } from '../../domain/repo/IBotMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';
import { ISocketService } from '../../domain/services/ISocketService';

export class SuggestFriendsUseCase {
  private virtualUserId: string;

  constructor(
    private userRepository: IUserRepository,
    private botMessageRepository: IBotMessageRepository,
    private chatRepository: IChatRepository,
    private blacklistRepository: IBlacklistRepository,
    private friendRepository: IFriendRepository,
    private createChatUseCase: CreateChatUseCase,
    private socketService: ISocketService,
    private suggestedPairRepository: ISuggestedPairRepository,
    virtualUserId: string
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

      const validUsers = activeUsers.filter(u => u.id && u.subscriptionStatus === SubscriptionStatus.Active && u.id !== this.virtualUserId);
      console.log(`Found ${validUsers.length} valid active users`);

      if (validUsers.length < 2) {
        console.log('Not enough valid active users to make suggestions');
        return;
      }

      const shuffledUsers = this.shuffle([...validUsers]);
      const suggestedPairs = new Set<string>(); // Tracks pairs (userId-suggestedUserId)
      const usersWhoSuggested = new Set<string>(); // Tracks users who have suggested someone
      let suggestionCount = 0;

      const createSuggestion = async (user: User, suggestedUser: User) => {
        const pairKey = `${user.id}-${suggestedUser.id}`;
        const reversePairKey = `${suggestedUser.id}-${user.id}`;
        if (suggestedPairs.has(pairKey) || suggestedPairs.has(reversePairKey)) {
          console.log(`Pair ${pairKey} or ${reversePairKey} already exists, skipping...`);
          return;
        }

        suggestedPairs.add(pairKey);
        usersWhoSuggested.add(user.id!);
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

      for (const user of shuffledUsers) {
        if (!user.id || usersWhoSuggested.has(user.id)) {
          console.log(`Skipping user with ID ${user.id} (invalid or already suggested)`);
          continue;
        }

        console.log(`Processing suggestion for ${user.name} (ID: ${user.id})`);

        const blacklistedUserIds = await this.blacklistRepository.getBlacklistedUsers(user.id);
        const friendUserIds = (await this.friendRepository.getFriends(user.id)).map(f => f.friendId.toString());
        console.log(`Blacklisted users for ${user.name}:`, blacklistedUserIds);
        console.log(`Existing friends for ${user.name}:`, friendUserIds);

        const possibleSuggestions = shuffledUsers.filter(u =>
          u.id &&
          u.id !== user.id &&
          u.id !== this.virtualUserId &&
          !blacklistedUserIds.includes(u.id) &&
          !friendUserIds.includes(u.id) &&
          !suggestedPairs.has(`${u.id}-${user.id}`) // Prevent reverse suggestion
        );

        if (possibleSuggestions.length === 0) {
          console.log(`No possible suggestions for ${user.name} (ID: ${user.id})`);
          continue;
        }

        const suggestedUser = possibleSuggestions[0];
        const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
        if (!suggestedUserExists) {
          console.log(`Suggested user ${suggestedUser.id} does not exist, skipping...`);
          continue;
        }

        await createSuggestion(user, suggestedUser);
      }

      console.log(`Friend suggestion process completed. Total suggestions stored: ${suggestionCount}`);
      // Log users who didn't suggest anyone
      const usersWithoutSuggestions = validUsers.filter(u => !usersWhoSuggested.has(u.id!));
      if (usersWithoutSuggestions.length > 0) {
        console.log(`Users without suggestions: ${usersWithoutSuggestions.map(u => `${u.name} (ID: ${u.id})`).join(', ')}`);
      }
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }
}