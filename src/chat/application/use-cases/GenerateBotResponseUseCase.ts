import { IChatRepository } from '../../domain/repo/IChatRepository';
import { getTemplatedMessage } from './../../config/MessageContentTemplates';
import { CONFIG } from '../../../main/config/config';

export class GenerateBotResponseUseCase {
  private botId = CONFIG.BOT_ID;
  private adminId = CONFIG.ADMIN;

  constructor(private chatRepository: IChatRepository) { }

  async execute(chatId: string, content: string, botId: string): Promise<string | null> {

    const chat = await this.chatRepository.findById(chatId);

    if (!chat) {
      console.log(`Chat ${chatId} not found for bot response`);
      return null;
    }

    if (chat.isGroup) {
      console.log(`Skipping bot response for group chat ${chatId}`);
      return null;
    }

    if (!botId || ![this.botId, this.adminId].includes(botId)) {
      console.log(`Invalid botId: ${botId}`);
      return null;
    }

    const templateKey = botId === this.botId ? 'bot1Response' : 'bot2Response';
    const { text } = getTemplatedMessage(templateKey, { content });
    return text;
  }
}