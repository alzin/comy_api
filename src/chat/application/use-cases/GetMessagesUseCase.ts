import mongoose from 'mongoose';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';

export class GetMessagesUseCase {
  private botMessageRepository: MongoBotMessageRepository;

  constructor(botMessageRepository: MongoBotMessageRepository) {
    this.botMessageRepository = botMessageRepository;
  }

  async execute(chatId: string) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error('Invalid chat ID');
    }
    return await this.botMessageRepository.findByChatId(chatId);
  }
}