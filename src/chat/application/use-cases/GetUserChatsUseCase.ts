import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat } from '../../domain/entities/Chat';

export class GetUserChatsUseCase {
  private chatRepository: IChatRepository;
  private userRepository: IUserRepository;
  private readonly comyBotId: string;

  constructor(chatRepository: IChatRepository, userRepository: IUserRepository) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
    this.comyBotId = process.env.BOT_ID ;
  }

  async execute(userId: string): Promise<Chat[]> {
    const chats = await this.chatRepository.findByUserId(userId);

    return Promise.all(
      chats.map(async (chat: Chat) => {
        let profileImageUrl = '';
        let botProfileImageUrl: string | undefined = undefined;
        let chatName = chat.name;

        if (!chat.isGroup) { 
          const botUser = await this.userRepository.findById(this.comyBotId);
          profileImageUrl = botUser && botUser.profileImageUrl != null ? botUser.profileImageUrl : '';
          const otherUserId = chat.users.find((id) => id !== userId);
          if (otherUserId) {
            const otherUser = await this.userRepository.findById(otherUserId);
            chatName = otherUser ? otherUser.name : 'Private Chat';
          }
        } else {
          const otherUserId = chat.users.find((id) => id !== userId && id !== this.comyBotId);
          if (otherUserId) {
            const otherUser = await this.userRepository.findById(otherUserId);
            profileImageUrl = otherUser && otherUser.profileImageUrl != null ? otherUser.profileImageUrl : '';
            chatName = otherUser ? `${otherUser.name}, COMY オフィシャル AI` : 'Group Chat with COMY オフィシャル AI';
          }
          const botUser = await this.userRepository.findById(this.comyBotId);
          botProfileImageUrl = botUser && botUser.profileImageUrl != null ? botUser.profileImageUrl : '';
        }

        return {
          ...chat,
          name: chatName,
          profileImageUrl,
          botProfileImageUrl,
        };
      })
    );
  }
}