//src/chat/application/use-cases/SuggestFriendsUseCase.ts
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
import { CONFIG } from '../../../main/config/config';

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

  private getOrderedPairKey(userId: string, suggestedUserId: string): string {
    return [userId, suggestedUserId].sort().join('-');
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

      let shuffledUsers = this.shuffle([...validUsers]);
      const suggestedPairs = new Set<string>();
      const suggestedUsers = new Set<string>(); 
      let suggestionCount = 0;

      const createSuggestion = async (user: User, suggestedUser: User) => {
        const pairKey = this.getOrderedPairKey(user.id!, suggestedUser.id!);
        if (suggestedPairs.has(pairKey)) {
          console.log(`Pair ${pairKey} already suggested, skipping...`);
          return;
        }

        const existingPair = await this.suggestedPairRepository.findByIds(user.id!, suggestedUser.id!);
        const reciprocalPair = await this.suggestedPairRepository.findByIds(suggestedUser.id!, user.id!);
        if (existingPair || reciprocalPair) {
          console.log(`Suggestion or reciprocal suggestion already exists for pair ${pairKey}, skipping...`);
          return;
        }

        suggestedPairs.add(pairKey);
        suggestedUsers.add(suggestedUser.id!);
        suggestionCount++;

        console.log(`Suggesting user: ${suggestedUser.name} (ID: ${suggestedUser.id}) to ${user.name} (ID: ${user.id})`);

        let chat = await this.chatRepository.findByUsers([user.id!, this.virtualUserId]);
        if (!chat) {
          console.log(`Creating new private chat for user ${user.id} with virtual user`);
          chat = await this.createChatUseCase.execute(
            [user.id!, this.virtualUserId],
            CONFIG.BOT_NAME,
            false
          );
          console.log(`Created chat with ID: ${chat.id}`);
        }

        if (!chat.id) {
          console.error(`Chat ID is null for user ${user.id}`);
          return;
        }

        await this.suggestedPairRepository.create({
          userId: user.id!,
          suggestedUserId: suggestedUser.id!,
          status: 'pending',
        });
        console.log(`Stored suggestion for user ${user.id} suggesting ${suggestedUser.id}`);
      };

      // First pass: Create initial suggestions
      for (const user of shuffledUsers) {
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

      // Second pass: Ensure all users are covered
      const unmatchedUsers = validUsers.filter(u =>
        u.id && u.id !== this.virtualUserId &&
        !suggestedPairs.has(this.getOrderedPairKey(u.id, u.id)) && // Not in any pair
        !Array.from(suggestedPairs).some(pair =>
          pair.includes(u.id!) // Not in any existing pair
        )
      );
      console.log(`Found ${unmatchedUsers.length} unmatched users: ${unmatchedUsers.map(u => u.name).join(', ')}`);

      if (unmatchedUsers.length > 0) {
        shuffledUsers = this.shuffle([...unmatchedUsers]);
        for (const user of shuffledUsers) {
          console.log(`Processing unmatched user ${user.name} (ID: ${user.id})`);

          const blacklistedUserIds = await this.blacklistRepository.getBlacklistedUsers(user.id!);
          const friendUserIds = (await this.friendRepository.getFriends(user.id!)).map(f => f.friendId.toString());

          // Allow suggesting to any valid user not in a pair with this user
          const possibleSuggestions = validUsers.filter(u =>
            u.id && u.id !== user.id && u.id !== this.virtualUserId &&
            !blacklistedUserIds.includes(u.id) && !friendUserIds.includes(u.id) &&
            !suggestedPairs.has(this.getOrderedPairKey(user.id!, u.id))
          );

          if (possibleSuggestions.length === 0) {
            console.log(`No possible suggestions for unmatched user ${user.name} (ID: ${user.id})`);
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
      }

      console.log(`Friend suggestion process completed. Total suggestions stored: ${suggestionCount}`);
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }
}