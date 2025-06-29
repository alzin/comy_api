import { IChatRepository } from '../../domain/repo/IChatRepository';
import { CONFIG } from '../../../main/config/config';
import { CreateChatUseCase } from './CreateChatUseCase';

export class CreateChatWithBotUseCase {
  private botId = CONFIG.BOT_ID;
  private adminId = CONFIG.ADMIN;

  constructor(
    private chatRepository: IChatRepository,
    private createChatUseCase: CreateChatUseCase
  ) {}

  async execute(
    userId: string,
  ): Promise<void> {

    let botChatId = await this.chatRepository.getPrivateChatId(userId, this.botId);

    if (!botChatId && userId !== this.adminId) {
      console.log(`Create a new conversation for the user ${userId} with bot ${this.botId}`);

      const newChat = await this.createChatUseCase.execute(
        [userId, this.botId],
        CONFIG.BOT_NAME,
        false
      );
      botChatId = newChat.id;
      console.log(`A new conversation has been created: ${botChatId}`);
    }

    else if (botChatId) {
      console.log(`Found an existing conversation for the user ${userId}: ${botChatId}`);
    }

  }
}














