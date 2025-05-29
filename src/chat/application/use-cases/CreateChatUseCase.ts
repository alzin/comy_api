import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat, ChatUser } from '../../domain/entities/Chat';

export class CreateChatUseCase {
  constructor(
    private chatRepository: IChatRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(
    userIds: string[],
    name: string,
    isGroup: boolean
  ): Promise<Chat> {
    if (!userIds || userIds.length < 2) {
      throw new Error('At least two users are required to create a chat');
    }

    const botId = process.env.BOT_ID;
    if (isGroup && !userIds.includes(botId)) {
      userIds.push(botId);
    }

    const existingChat = await this.chatRepository.findByUsers(userIds);
    if (existingChat) {
      throw new Error('Chat already exists for these users');
    }

    const usersDetails: ChatUser[] = await Promise.all(
      userIds.map(async (id) => {
        const user = await this.userRepository.findById(id);
        const role = id === botId ? 'bot' : (id === process.env.ADMIN ? 'admin' : 'user');
        return {
          role,
          id,
          image: user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png',
        };
      })
    );

    let chatName = name;
    if (!chatName) {
      if (!isGroup) {
        const otherUser = usersDetails.find((u) => u.id !== botId);
        chatName = otherUser ? otherUser.name || 'Private Chat' : 'COMY オフィシャル AI';
      } else {
        const nonBotUsers = usersDetails.filter((u) => u.id !== botId);
        chatName = nonBotUsers.map((u) => u.name).join(', ') || 'Group Chat';
      }
    }

    const chat: Chat = {
      id: null, // Repository will assign ID
      name: chatName,
      isGroup,
      users: usersDetails,
      createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      updatedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      latestMessage: null,
    };

    return await this.chatRepository.create(chat);
  }
}