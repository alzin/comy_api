import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { GenerateBotResponseUseCase } from './GenerateBotResponseUseCase';
import { Message } from '../../domain/entities/Message';
import { LatestMessage } from '../../domain/entities/Chat';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { CONFIG } from '../../../main/config/config';

export class SendMessageUseCase {
  private botId = CONFIG.BOT_ID;
  private adminId = CONFIG.ADMIN;

  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly chatRepository: IChatRepository,
    private readonly socketService: ISocketService,
    private readonly generateBotResponseUseCase: GenerateBotResponseUseCase,
    private readonly userRepository: IUserRepository
  ) { }

  async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
    const { senderId, content, chatId } = data;

    const chat = await this.chatRepository.findById(chatId);

    if (!chat) {
      throw new Error('Chat not found');
    }

    const sender = await this.userRepository.findById(senderId);

    if (!sender) {
      throw new Error('Sender not found');
    }

    const senderName = sender.name || 'Unknown User';
    const senderProfileImageUrl = sender.profileImageUrl;

    const message = await this.createMessage(senderId, senderName, content, chatId, senderProfileImageUrl);

    const savedMessage = await this.sendMessage(message, chatId);

    if (this.botId && chat.users.some(user => user.id === this.botId)) {
      await this.handleBotResponse(chatId, content, this.botId);
    }

    if (this.adminId && chat.users.some(user => user.id === this.adminId)) {
      await this.handleBotResponse(chatId, content, this.adminId);
    }

    return savedMessage;
  }

  private async createMessage(senderId: string, senderName: string, content: string, chatId: string, senderProfileImageUrl?: string): Promise<Message> {
    return {
      senderId,
      senderName,
      content,
      chatId,
      readBy: [senderId],
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      isMatchCard: false,
      isSuggested: false,
      senderProfileImageUrl,
    };
  }

  private createLatestMessage(savedMessage: Message): LatestMessage {
    return {
      id: savedMessage.id,
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
      readBy: savedMessage.readBy,
    };
  }

  private async sendMessage(message: Message, chatId: string): Promise<Message> {
    const savedMessage = await this.messageRepository.create(message);
    const latestMessage = this.createLatestMessage(savedMessage);
    await this.chatRepository.update(chatId, { latestMessage });
    this.socketService.emitMessage(chatId, savedMessage);
    return savedMessage;
  }

  private async handleBotResponse(chatId: string, content: string, botId: string): Promise<void> {
    const botResponse = await this.generateBotResponseUseCase.execute(chatId, content, botId);
    if (botResponse) {
      const botMessage = await this.createMessage(
        botId,
        'COMY オフィシャル AI',
        botResponse,
        chatId,
        CONFIG.BOT_IMAGE_URL
      );
      await this.sendMessage(botMessage, chatId);
    }
  }
}