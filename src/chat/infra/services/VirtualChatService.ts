import { ISocketService } from '../../domain/services/ISocketService';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IBotMessageRepository } from '../../domain/repo/IBotMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import mongoose from 'mongoose';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';

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
        name: 'Virtual Bot',
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

      const validUsers = activeUsers.filter(u => u.id && mongoose.Types.ObjectId.isValid(u.id) && u.isEmailVerified);
      console.log(`Found ${validUsers.length} users with valid IDs and verified emails`);

      if (validUsers.length < 2) {
        console.log('Not enough valid users to make suggestions');
        return;
      }

      const shuffledUsers = this.shuffle([...validUsers]);
      const suggestedPairs = new Set<string>();

      for (const user of shuffledUsers) {
        if (!user.id || user.id === this.virtualUserId) {
          console.log(`Skipping user with ID ${user.id} (invalid or virtual user)`);
          continue;
        }

        const existingSuggestion = await this.botMessageRepository.findByUserAndStatus(user.id, ['pending']);
        if (existingSuggestion) {
          console.log(`User ${user.name} (ID: ${user.id}) already has a pending suggestion, skipping...`);
          continue;
        }

        // التحقق من القائمة السوداء
        const blacklistedUsers = await this.blacklistRepository.getBlacklistedUsers(user.id);
        console.log(`Blacklisted users for ${user.name} (ID: ${user.id}):`, blacklistedUsers);

        const suggestedUser = shuffledUsers.find(u => {
          if (!u.id || u.id === user.id || u.id === this.virtualUserId) return false;
          const pairKey = `${user.id}-${u.id}`;
          const reversePairKey = `${u.id}-${user.id}`;
          return (
            !suggestedPairs.has(pairKey) &&
            !suggestedPairs.has(reversePairKey) &&
            !blacklistedUsers.includes(u.id)
          );
        });

        if (!suggestedUser || !suggestedUser.id) {
          console.log(`No suitable user to suggest for ${user.name} (ID: ${user.id})`);
          continue;
        }

        const suggestedUserExists = await this.userRepository.findById(suggestedUser.id);
        if (!suggestedUserExists) {
          console.log(`Suggested user ${suggestedUser.name} (ID: ${suggestedUser.id}) does not exist in database, skipping...`);
          continue;
        }

        const pairKey = `${user.id}-${suggestedUser.id}`;
        suggestedPairs.add(pairKey);
        console.log(`Suggesting user: ${suggestedUser.name} (ID: ${suggestedUser.id}, Email: ${suggestedUser.email}, Category: ${suggestedUser.category}) to ${user.name} (ID: ${user.id})`);

        let chat = await this.chatRepository.findByUsers([user.id, this.virtualUserId]);
        if (!chat) {
          console.log(`Creating new private chat for user ${user.id} with virtual user`);
          chat = await this.createChatUseCase.execute(
            [user.id, this.virtualUserId],
            'Private Chat',
            false
          );
          console.log(`Created chat with ID: ${chat.id}`);
        }

        const suggestionMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          chatId: chat.id,
          senderId: this.virtualUserId,
          recipientId: user.id,
          suggestedUser: suggestedUser.id,
          suggestionReason: 'Random',
          status: 'pending' as const,
          createdAt: new Date(),
          content: `Suggested friend: ${suggestedUser.name} (${suggestedUser.category})`,
          readBy: []
        };

        await this.botMessageRepository.create(suggestionMessage);
        console.log(`Saved suggestion message with ID: ${suggestionMessage.id}`);
        console.log(`[Bot] Suggested user ${suggestedUser.name} (ID: ${suggestedUser.id}) to user ${user.id}`);

        this.socketService.emitMessage({
          id: suggestionMessage.id,
          sender: this.virtualUserId,
          senderDetails: { name: 'Virtual Bot', email: 'virtual@chat.com' },
          content: suggestionMessage.content,
          chatId: chat.id,
          readBy: [],
          createdAt: new Date()
        });
      }

      console.log('Friend suggestion process completed.');
    } catch (error) {
      console.error('Error in suggestFriends:', error);
      throw error;
    }
  }
}