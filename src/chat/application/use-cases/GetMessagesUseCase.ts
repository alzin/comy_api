///src/chat/application/use-cases/GetMessagesUseCase.ts
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';

export class GetMessagesUseCase {
  constructor(private messageRepository: IMessageRepository) {}

  async execute(chatId: string, page: number = 1, limit: number = 20): Promise<Message[]> {
    return await this.messageRepository.findByChatId(chatId, page, limit);
  }
}