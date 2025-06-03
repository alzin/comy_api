import { IChatRepository } from '../../domain/repo/IChatRepository';
import { CONFIG } from '../../../main/config/config';
export class GenerateBotResponseUseCase {
  constructor(private chatRepository: IChatRepository) { }

  async execute(chatId: string, content: string, botId: string): Promise<string | null> {
    const bot1Id = CONFIG.BOT_ID;
    const bot2Id = CONFIG.ADMIN;

    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      console.log(`Chat ${chatId} not found for bot response`);
      return null;
    }
    if (chat.isGroup) {
      console.log(`Skipping bot response for group chat ${chatId}`);
      return null;
    }

    if (botId === bot1Id) {
      return `COMY オフィシャル AI: Thanks for your message "${content}"! How can I assist you today?`;
    } else if (botId === bot2Id) {
      return `COMY オフィシャル AI: こんにちは！ "${content}" についてもっと教えてください！`;
    }

    return null;
  }
}