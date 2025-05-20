import mongoose from 'mongoose';
import { ISocketService } from '../../domain/services/ISocketService';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { BotMessage, IBotMessageRepository } from '../../domain/repo/IBotMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IBlacklistRepository } from '../../../chat/domain/repo/IBlacklistRepository';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';
import BotMessageModel from '../../../chat/infra/database/models/models/BotMessageModel';
import { Message } from '../../../chat/domain/entities/Message';

export class VirtualChatService {
  private virtualUserId: string = '';

  constructor(
    private socketService: ISocketService,
    private userRepository: IUserRepository,
    private botMessageRepository: IBotMessageRepository,
    private chatRepository: IChatRepository,
    private blacklistRepository: IBlacklistRepository,
    private createChatUseCase: CreateChatUseCase
  ) {}

  private shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async initialize(): Promise<void> {
    const virtualUserEmail = 'virtual@chat.com';
    let virtualUser = await this.userRepository.findByEmail(virtualUserEmail);

    if (!virtualUser) {
      virtualUser = {
        id: new mongoose.Types.ObjectId().toString(),
        email: virtualUserEmail,
        password: 'virtual_password',
        name: 'COMY オフィシャル AI',
        category: 'bot',
        isOnline: true,
        subscriptionStatus: SubscriptionStatus.Active,
        lastActive: new Date()
      };
      await this.userRepository.create(virtualUser);
      console.log('Virtual user created:', virtualUserEmail);
    } else {
      console.log('Virtual user already exists:', virtualUserEmail);
    }

    if (!virtualUser || !virtualUser.id) {
      throw new Error('Failed to initialize virtual user');
    }
    this.virtualUserId = virtualUser.id;

    console.log('Virtual chat bot initialized successfully');
  }

  async suggestFriends(): Promise<void> {
    console.log('Starting friend suggestion process...');

    try {
      const activeUsers = await this.userRepository.findActiveUsers();
      console.log(`Found ${activeUsers.length} active users`);

      const validUsers = activeUsers.filter(u => {
        const isValid = u.id && mongoose.Types.ObjectId.isValid(u.id) && u.subscriptionStatus === SubscriptionStatus.Active;
        if (!isValid) {
          console.log(`Invalid user filtered out:`, { id: u.id, subscriptionStatus: u.subscriptionStatus });
        }
        return isValid;
      });
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

        const defaultProfileImageUrl = 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';
        const profileImageUrl = suggestedUser.profileImageUrl || defaultProfileImageUrl;
        const suggestedUserName = suggestedUser.name || 'User';
        const suggestedUserCategory = suggestedUser.category || 'unknown';

        const suggestionContent = `${user.name || 'User'}さん、おはようございます！\n今週は${user.name || 'User'}さんにおすすめの方で${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！\n${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは“自社の強みテーブル”です！\nお繋がりを希望しますか？`;

        const suggestionMessage: BotMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          chatId: chat.id,
          senderId: this.virtualUserId,
          recipientId: user.id!,
          suggestedUser: suggestedUser.id!,
          suggestionReason: 'Random',
          status: 'pending',
          content: suggestionContent,
          createdAt: new Date(),
          readBy: [this.virtualUserId],
          isMatchCard: true,
          isSuggested: true, // Explicitly true for friend suggestions
          suggestedUserProfileImageUrl: profileImageUrl,
          suggestedUserName,
          suggestedUserCategory
        };

        const existingMessage = await BotMessageModel.findOne({
          chatId: chat.id,
          senderId: this.virtualUserId,
          recipientId: user.id,
          suggestedUser: suggestedUser.id,
          status: 'pending'
        });
        if (existingMessage) {
          console.log(`Duplicate suggestion found for user ${user.id} suggesting ${suggestedUser.id}, skipping...`);
          return;
        }

        await this.botMessageRepository.create(suggestionMessage);
        console.log(`Saved suggestion message with ID: ${suggestionMessage.id} in chat ${chat.id}`);

        const message: Message = {
          id: suggestionMessage.id,
          sender: this.virtualUserId,
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          content: suggestionMessage.content || '',
          chatId: chat.id,
          createdAt: suggestionMessage.createdAt!,
          readBy: suggestionMessage.readBy,
          isMatchCard: suggestionMessage.isMatchCard ?? false,
          isSuggested: suggestionMessage.isSuggested ?? false,
          suggestedUserProfileImageUrl: suggestionMessage.suggestedUserProfileImageUrl,
          suggestedUserName: suggestionMessage.suggestedUserName,
          suggestedUserCategory: suggestionMessage.suggestedUserCategory,
          status: suggestionMessage.status
        };

        this.socketService.emitMessage(chat.id, message);
        console.log(`Emitted suggestion message ${message.id} to chat ${chat.id}`);
      };

      for (const user of validUsers) {
        if (!user.id || user.id === this.virtualUserId) {
          console.log(`Skipping user with ID ${user.id} (invalid or virtual user)`);
          continue;
        }

        console.log(`Processing suggestion for ${user.name} (ID: ${user.id})`);

        const blacklistedUserIds = await this.blacklistRepository.getBlacklistedUsers(user.id);
        console.log(`Blacklisted users for ${user.name} (ID: ${user.id}):`, blacklistedUserIds);

        const possibleSuggestions = validUsers.filter(u =>
          u.id &&
          u.id !== user.id &&
          u.id !== this.virtualUserId &&
          !suggestedUsers.has(u.id) &&
          !blacklistedUserIds.includes(u.id)
        );

        if (possibleSuggestions.length === 0) {
          console.log(`No possible suggestions for ${user.name} (ID: ${user.id}) after filtering blacklisted users`);
          const fallbackSuggestions = validUsers.filter(u =>
            u.id &&
            u.id !== user.id &&
            u.id !== this.virtualUserId &&
            !blacklistedUserIds.includes(u.id)
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

          await createSuggestion(user, suggestedUser);
          continue;
        }

        const shuffledSuggestions = this.shuffle([...possibleSuggestions]);
        const suggestedUser = shuffledSuggestions[0];

        const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
        if (!suggestedUserExists) {
          console.log(`Suggested user ${suggestedUser.name} (ID: ${suggestedUser.id}) does not exist in database, skipping...`);
          continue;
        }

        await createSuggestion(user, suggestedUser);
      }

      console.log(`Friend suggestion process completed. Total suggestions made: ${suggestionCount}. Users without suggestions: ${validUsers.length - suggestionCount}`);
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }

  async generateBotResponse(chatId: string, content: string, botId: string): Promise<string | null> {
    const bot1Id = '681547798892749fbe910c02';
    const bot2Id = '681c757539ec003942b3f97e';

    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      console.log(`Chat ${chatId} not found for bot response`);
      return null;
    }
    if (chat.isGroup) {
      console.log(`Skipping bot response for group chat ${chatId}`);
      return null;
    }

    if (botId === bot1Id) {
      return `COMY オフィシャル AI: Thanks for your message "${content}"! How can I assist you today?`;
    } else if (botId === bot2Id) {
      return `COMY オフィシャル AI: こんにちは！ "${content}" についてもっと教えてください！`;
    }

    return null;
  }
}