import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';
import { Message } from '../../domain/entities/Message';
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

      const validUsers = activeUsers.filter(u => u.id && u.subscriptionStatus === SubscriptionStatus.Active);
      console.log(`Found ${validUsers.length} valid active users`);

      if (validUsers.length < 2) {
        console.log('Not enough valid active users to make suggestions');
        return;
      }

      const shuffledUsers = this.shuffle([...validUsers]);
      const suggestedPairs = new Set<string>();
      const suggestedUsers = new Set<string>();
      let suggestionCount = 0;

      const createSuggestion = async (user: User, suggestedUser: User) => {
        const pairKey = `${user.id}-${suggestedUser.id}`;
        suggestedPairs.add(pairKey);
        suggestedUsers.add(suggestedUser.id!);
        suggestionCount++;

        console.log(`Suggesting user: ${suggestedUser.name} (ID: ${suggestedUser.id}, Category: ${suggestedUser.category}) to ${user.name} (ID: ${user.id})`);

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

        const verifiedSuggestedUser = await this.userRepository.findById(suggestedUser.id!);
        const profileImageUrl = verifiedSuggestedUser?.profileImageUrl ?? '';
        const suggestedUserName = verifiedSuggestedUser?.name || suggestedUser.name || 'User';
        const suggestedUserCategory = verifiedSuggestedUser?.category || suggestedUser.category || 'unknown';

        const suggestionContent = `${user.name || 'User'}さん、おはようございます！\n今週は${user.name || 'User'}さんにおすすめの方で${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！\n${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは“自社の強みテーブル”です！\nお繋がりを希望しますか？`;

        const suggestionMessage: BotMessage = {
          id: null, // Repository will assign ID
          chatId: chat.id,
          senderId: this.virtualUserId,
          recipientId: user.id!,
          suggestedUser: suggestedUser.id!,
          suggestionReason: 'Random',
          status: 'pending',
          content: suggestionContent,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: [this.virtualUserId],
          isMatchCard: true,
          isSuggested: true,
          suggestedUserProfileImageUrl: profileImageUrl,
          suggestedUserName,
          suggestedUserCategory
        };

        const existingMessage = await this.botMessageRepository.findExistingSuggestion(
          chat.id,
          this.virtualUserId,
          user.id!,
          suggestedUser.id!
        );
        if (existingMessage) {
          console.log(`Duplicate suggestion found for user ${user.id} suggesting ${suggestedUser.id}, skipping...`);
          return;
        }

        await this.botMessageRepository.create(suggestionMessage);
        console.log(`Saved suggestion message in chat ${chat.id}`);

        const message: Message = {
          id: suggestionMessage.id || '', // Will be set by repository
          senderId: this.virtualUserId,
          senderName: 'COMY オフィシャル AI',
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          content: suggestionMessage.content || '',
          chatId: chat.id,
          createdAt: suggestionMessage.createdAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: suggestionMessage.readBy,
          isMatchCard: suggestionMessage.isMatchCard ?? false,
          isSuggested: suggestionMessage.isSuggested ?? false,
          suggestedUserProfileImageUrl: suggestionMessage.suggestedUserProfileImageUrl ?? '',
          suggestedUserName: suggestionMessage.suggestedUserName,
          suggestedUserCategory: suggestionMessage.suggestedUserCategory,
          status: suggestionMessage.status
        };

        this.socketService.emitMessage(chat.id, message);
        console.log(`Emitted suggestion message to chat ${chat.id}`);
      };

      for (const user of validUsers) {
        if (!user.id || user.id === this.virtualUserId) {
          console.log(`Skipping user with ID ${user.id} (invalid or virtual user)`);
          continue;
        }

        console.log(`Processing suggestion for ${user.name} (ID: ${user.id})`);

        const blacklistedUserIds = await this.blacklistRepository.getBlacklistedUsers(user.id);
        const friendUserIds = (await this.friendRepository.getFriends(user.id)).map(f => f.friendId.toString());
        console.log(`Blacklisted users for ${user.name} (ID: ${user.id}):`, blacklistedUserIds);
        console.log(`Existing friends for ${user.name} (ID: ${user.id}):`, friendUserIds);

        const possibleSuggestions = validUsers.filter(u =>
          u.id &&
          u.id !== user.id &&
          u.id !== this.virtualUserId &&
          !suggestedUsers.has(u.id) &&
          !blacklistedUserIds.includes(u.id) &&
          !friendUserIds.includes(u.id)
        );

        if (possibleSuggestions.length === 0) {
          console.log(`No possible suggestions for ${user.name} (ID: ${user.id}) after filtering blacklisted and friend users`);
          const fallbackSuggestions = validUsers.filter(u =>
            u.id &&
            u.id !== user.id &&
            u.id !== this.virtualUserId &&
            !blacklistedUserIds.includes(u.id) &&
            !friendUserIds.includes(u.id)
          );
          if (fallbackSuggestions.length === 0) {
            console.log(`No fallback suggestions available for ${user.name} (ID: ${user.id})`);
            continue;
          }
          const shuffledFallback = this.shuffle([...fallbackSuggestions]);
          const suggestedUser = shuffledFallback[0];

          const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
          if (!suggestedUserExists) {
            console.log(`Suggested user ${suggestedUser.name} (ID: ${suggestedUser.id}) does not exist in database, skipping...`);
            continue;
          }

          await createSuggestion(user, suggestedUser as User);
          continue;
        }

        const shuffledSuggestions = this.shuffle([...possibleSuggestions]);
        const suggestedUser = shuffledSuggestions[0];

        const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
        if (!suggestedUserExists) {
          console.log(`Suggested user ${suggestedUser.name} (ID: ${suggestedUser.id}) does not exist in database, skipping...`);
          continue;
        }

        await createSuggestion(user, suggestedUser as User);
      }

      console.log(`Friend suggestion process completed. Total suggestions made: ${suggestionCount}. Users without suggestions: ${validUsers.length - suggestionCount}`);
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }
}