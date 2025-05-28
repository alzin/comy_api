import { IChatRepository } from '../../domain/repo/IChatRepository';

export class GenerateBotResponseUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(chatId: string, content: string, botId: string): Promise<string | null> {
    const bot1Id = '681547798892749fbe910c02';
    const bot2Id = '681c757539ec003942b3f97e';

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