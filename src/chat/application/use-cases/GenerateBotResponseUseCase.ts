import { IChatRepository } from '../../domain/repo/IChatRepository';
import { getTemplatedMessage } from './../../config/MessageContentTemplates';

export class GenerateBotResponseUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(chatId: string, content: string, botId: string): Promise<string | null> {
    const bot1Id = process.env.BOT_ID;
    const bot2Id = process.env.ADMIN;

    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      console.log(`Chat ${chatId} not found for bot response`);
      return null;
    }
    if (chat.isGroup) {
      console.log(`Skipping bot response for group chat ${chatId}`);
      return null;
    }

    if (!botId || ![bot1Id, bot2Id].includes(botId)) {
      console.log(`Invalid botId: ${botId}`);
      return null;
    }

    const templateKey = botId === bot1Id ? 'bot1Response' : 'bot2Response';
    const { text } = getTemplatedMessage(templateKey, { content });
    return text;
  }
}