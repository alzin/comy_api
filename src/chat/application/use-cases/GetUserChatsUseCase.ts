///src/chat/application/use-cases/GetUserChatsUseCase.ts
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat, ChatUser } from '../../domain/entities/Chat';
import { CONFIG } from '../../../main/config/config';

export class GetUserChatsUseCase {
  private readonly chatRepository: IChatRepository;
  private readonly userRepository: IUserRepository;
  private readonly botId: string = CONFIG.BOT_ID;
  private readonly adminId: string = CONFIG.ADMIN;

  constructor(chatRepository: IChatRepository, userRepository: IUserRepository) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute(userId: string): Promise<Chat[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const chats = await this.chatRepository.findByUserId(userId);

    return Promise.all(
      chats.map(async (chat: Chat) => {
        const usersWithDetails = await this.getUsersWithDetails(chat.users);
        const filteredUsers = chat.isGroup ? usersWithDetails.filter((u) => u.id !== this.botId) : usersWithDetails;
        const usersWithRoles = this.assignUserRoles(filteredUsers, userId, chat.isGroup);
        const chatName = this.getChatName(usersWithRoles, userId, chat.isGroup);

        return {
          ...chat,
          name: chatName,
          users: usersWithRoles.map(({ role, id, image }) => ({ role, id, image })),
        };
      })
    );
  }

  private async getUsersWithDetails(users: ChatUser[]): Promise<ChatUser[]> {
    return Promise.all(
      users.map(async (chatUser) => {
        const user = await this.userRepository.findById(chatUser.id);
        return {
          ...chatUser,
          name: user?.name || 'Unknown User',
          image: user?.profileImageUrl,
        };
      })
    );
  }

  private assignUserRoles(users: ChatUser[], userId: string, isGroup: boolean): ChatUser[] {
    const isAdmin = userId === this.adminId;
    return users.map((user, index) => {
      if (user.id === this.botId) return { ...user, role: 'bot' };
      if (user.id === this.adminId) return { ...user, role: 'admin' };
      if (isGroup && isAdmin) return { ...user, role: index === 0 ? 'user-a' : 'user-b' };
      return { ...user, role: user.id === userId ? 'user-b' : 'user-a' };
    });
  }

  private getChatName(users: ChatUser[], userId: string, isGroup: boolean): string {
    if (!isGroup) {
      const otherUser = users.find((u) => u.id !== userId);
      return otherUser?.id === this.botId ? 'COMY オフィシャル AI' : otherUser?.name || 'Private Chat';
    }

    const isAdmin = userId === this.adminId;
    const filteredUsers = isAdmin
      ? users.filter((u) => u.id !== this.adminId)
      : users.filter((u) => u.id !== userId && u.role !== 'admin');
    const adminUser = users.find((u) => u.role === 'admin');
    const names = filteredUsers.map((u) => u.name).join(', ');
    return adminUser && !isAdmin ? `${names}, ${adminUser.name}` : names || 'Group Chat';
  }
}