import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';

export class GetUserChatsUseCase {
  private chatRepository: IChatRepository;
  private readonly comyBotId: string;

  constructor(chatRepository: IChatRepository) {
    this.chatRepository = chatRepository;
    this.comyBotId = process.env.BOT_ID || '681c757539ec003942b3f97e';
  }

  async execute(userId: string): Promise<Chat[]> {
    const chats = await this.chatRepository.findByUserId(userId);

    return chats.map((chat: Chat) => {
      const filteredUsers = chat.users.filter((userId: string) => userId !== this.comyBotId);
      return { ...chat, users: filteredUsers };
    });
  }
}