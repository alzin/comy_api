import { Message } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';

export class GetMessagesUseCase {
  constructor(private messageRepository: IMessageRepository) {}

  async execute(chatId: string, page: number, limit: number): Promise<Message[]> {
    return this.messageRepository.findByChatId(chatId, page, limit);
  }
}