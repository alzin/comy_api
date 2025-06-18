import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat, ChatUser } from '../../domain/entities/Chat';
import { CONFIG } from '../../../main/config/config';

export class CreateChatUseCase {
  constructor(
    private chatRepository: IChatRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(userIds: string[], name: string, isGroup: boolean): Promise<Chat> {
    if (!userIds || userIds.length < 2) {
      throw new Error('At least two users are required to create a chat');
    }

    const botId = CONFIG.BOT_ID;

    let filteredUserIds = isGroup ? userIds.filter((id) => id !== botId) : userIds;

    if (filteredUserIds.length < 2) {
      throw new Error('At least two non-bot users are required to create a chat');
    }

    if (!isGroup && !filteredUserIds.includes(botId) && filteredUserIds.length === 1) {
      filteredUserIds.push(botId);
    }

    const existingChat = await this.chatRepository.findByUsers(filteredUserIds);
    if (existingChat) {
      throw new Error('Chat already exists for these users');
    }

    const usersDetails: ChatUser[] = await Promise.all(
      filteredUserIds.map(async (id) => {
        const user = await this.userRepository.findById(id);
        const role = id === botId ? 'bot' : id === CONFIG.ADMIN ? 'admin' : 'user';
        return {
          role,
          id,
          image: user?.profileImageUrl || '',
          name: user?.name || 'Unknown User',
        };
      })
    );

    let chatName = name;
    if (!chatName) {
      if (!isGroup) {
        const otherUser = usersDetails.find((u) => u.id !== botId);
        chatName = otherUser?.id === botId ? 'COMY オフィシャル AI' : otherUser?.name || 'Private Chat';
      } else {
        chatName = usersDetails.map((u) => u.name).join(', ') || 'Group Chat';
      }
    }

    const chat: Chat = {
      id: null, 
      name: chatName,
      isGroup,
      users: usersDetails,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo'}),
      updatedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo'}),
      latestMessage: null,
      profileImageUrl: ''
    };

    return await this.chatRepository.create(chat);
  }
}