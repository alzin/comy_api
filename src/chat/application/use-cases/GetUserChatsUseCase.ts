///src/chat/application/use-cases/GetUserChatsUseCase.ts
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { Chat } from '../../domain/entities/Chat';

export class GetUserChatsUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(userId: string): Promise<Chat[]> {
    return this.chatRepository.findByUserId(userId);
  }
}