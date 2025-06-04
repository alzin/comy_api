///src/chat/application/use-cases/GetUserChatsUseCase.ts
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { Chat } from '../../domain/entities/Chat';

export class GetUserChatsUseCase {
  private chatRepository: IChatRepository;
  private userRepository: IUserRepository;
  private readonly botId: string = process.env.BOT_ID; 
  private readonly adminId: string = process.env.ADMIN; 

  constructor(chatRepository: IChatRepository, userRepository: IUserRepository) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute(userId: string): Promise<Chat[]> {
    const chats = await this.chatRepository.findByUserId(userId);

    return Promise.all(
      chats.map(async (chat: Chat) => {
        const usersWithNames = await Promise.all(
          chat.users.map(async (chatUser) => {
            const user = await this.userRepository.findById(chatUser.id);
            return {
              ...chatUser,
              name: user?.name || 'Unknown User',
              image: user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
            };
          })
        );

        const filteredUsers = chat.isGroup
          ? usersWithNames.filter((u) => u.id !== this.botId) 
          : usersWithNames;

        let usersWithRoles;
        const isAdmin = userId === this.adminId;

        if (isAdmin && chat.isGroup) {
          const nonAdminUsers = filteredUsers.filter((u) => u.id !== this.adminId);
          usersWithRoles = filteredUsers.map((user, index) => {
            if (user.id === this.adminId) {
              return { ...user, role: 'admin' }; 
            }
            return {
              ...user,
              role: index === 0 ? 'user-a' : 'user-b',
            };
          });
        } else {
          usersWithRoles = filteredUsers.map((user) => {
            if (user.id === this.botId) {
              return { ...user, role: 'bot' }; 
            }
            if (user.id === this.adminId) {
              return { ...user, role: 'admin' };
            }
            return {
              ...user,
              role: user.id === userId ? 'user-b' : 'user-a',
            };
          });
        }

        let chatName = '';

        if (!chat.isGroup) {
          const otherUser = usersWithRoles.find((u) => u.id !== userId);
          if (otherUser) {
            chatName = otherUser.id === this.botId ? 'COMY オフィシャル AI' : otherUser.name;
          }
        } else {
          if (isAdmin) {
            const nonAdminUsers = usersWithRoles.filter((u) => u.role !== 'admin');
            chatName = nonAdminUsers.map((u) => u.name).join(', ') || 'Group Chat';
          } else {
            const otherUsers = usersWithRoles.filter((u) => u.id !== userId);
            const adminUser = usersWithRoles.find((u) => u.role === 'admin');
            const otherNames = otherUsers
              .filter((u) => u.role !== 'admin') 
              .map((u) => u.name)
              .join(', ');
            chatName = adminUser ? `${otherNames}, ${adminUser.name}` : otherNames || 'Group Chat';
          }
        }

        return {
          ...chat,
          name: chatName,
          users: usersWithRoles.map(({ role, id, image }) => ({ role, id, image })),
        };
      })
    );
  }
}