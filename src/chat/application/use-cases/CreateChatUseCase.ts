import { Chat } from '../../domain/entities/Chat';
import { IChatRepository } from '../../domain/repo/IChatRepository';

export class CreateChatUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(
    name: string | null,
    isGroupChat: boolean,
    users: string[],
    userId: string
  ): Promise<Chat> {
    const userIds = [...new Set([...users, userId])];
    if (!isGroupChat && userIds.length === 2) {
      const existingChat = await this.chatRepository.findByUsers(userIds);
      if (existingChat) return existingChat;
    }

    const chat: Chat = {
      name: isGroupChat ? name : null,
      isGroupChat,
      users: userIds,
      admin: isGroupChat ? userId : null,
      latestMessage: null,
    };

    return this.chatRepository.create(chat);
  }
}