import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat } from '../../domain/entities/Chat';

export class GetUserChatsUseCase {
  private chatRepository: IChatRepository;
  private userRepository: IUserRepository;
  private readonly comyBotId: string;
  private readonly bot2Id: string = '681c757539ec003942b3f97e';

  constructor(chatRepository: IChatRepository, userRepository: IUserRepository) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
    this.comyBotId = process.env.BOT_ID || '681c757539ec003942b3f97e';
  }

  async execute(userId: string): Promise<Chat[]> {
    const chats = await this.chatRepository.findByUserId(userId);

    return Promise.all(
      chats.map(async (chat: Chat) => {
        let chatName = chat.name;
        let profileImageUrl = chat.profileImageUrl || '';
        let profileImageUrls: string[] | undefined = undefined;
        let botProfileImageUrl = chat.botProfileImageUrl;

        if (!chat.isGroup) {
          // Private chats: Show the other user's name
          const otherUserId = chat.users.find((id) => id !== userId);
          if (otherUserId) {
            const otherUser = await this.userRepository.findById(otherUserId);
            chatName = otherUser ? otherUser.name : 'Private Chat';
            profileImageUrl = otherUser && otherUser.profileImageUrl != null ? otherUser.profileImageUrl : '';
          }
          const botUser = await this.userRepository.findById(this.comyBotId);
          botProfileImageUrl = botUser && botUser.profileImageUrl != null ? botUser.profileImageUrl : '';
        } else {
          if (userId === this.bot2Id) {
            // For bot2: Show all non-bot users' names and profile images
            const nonBotUsers = await Promise.all(
              chat.users
                .filter((id) => id !== this.comyBotId)
                .map(async (id) => await this.userRepository.findById(id))
            );
            chatName = nonBotUsers.map(u => u?.name || 'Unknown').join(', ');
            profileImageUrls = nonBotUsers
              .map(u => u?.profileImageUrl || '')
              .filter(url => url);
            profileImageUrl = ''; // bot2 doesn't need a single profile image
          } else {
            // For other users: Show other user's name + bot, single profile image
            const otherUserId = chat.users.find((id) => id !== userId && id !== this.comyBotId);
            if (otherUserId) {
              const otherUser = await this.userRepository.findById(otherUserId);
              chatName = otherUser ? `${otherUser.name}, COMY オフィシャル AI` : 'Group Chat with COMY オフィシャル AI';
              profileImageUrl = otherUser && otherUser.profileImageUrl != null ? otherUser.profileImageUrl : '';
            }
            const botUser = await this.userRepository.findById(this.comyBotId);
            botProfileImageUrl = botUser && botUser.profileImageUrl != null ? botUser.profileImageUrl : '';
          }
        }

        // Log for debugging
        console.log(`User: ${userId}, Chat ID: ${chat.id}, Name: ${chatName}, ProfileImageUrl: ${profileImageUrl}, ProfileImageUrls: ${profileImageUrls?.join(', ')}`);

        return {
          ...chat,
          name: chatName,
          profileImageUrl,
          profileImageUrls,
          botProfileImageUrl,
        };
      })
    );
  }
}