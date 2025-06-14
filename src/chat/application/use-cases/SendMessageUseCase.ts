import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { GenerateBotResponseUseCase } from './GenerateBotResponseUseCase';
import { Message } from '../../domain/entities/Message';
import { LatestMessage } from '../../domain/entities/Chat';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { CONFIG } from '../../../main/config/config';

export class SendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly chatRepository: IChatRepository,
    private readonly socketService: ISocketService,
    private readonly generateBotResponseUseCase: GenerateBotResponseUseCase,
    private readonly userRepository: IUserRepository
  ) {}

  private truncateContent(content: string): string {
    return content.length > 20 ? content.substring(0, 20) : content;
  }

  async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
    const { senderId, content, chatId } = data;

    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    if (!(await this.chatRepository.isValidId(chatId))) {
      throw new Error(`Invalid chatId: ${chatId}`);
    }

    if (!(await this.userRepository.isValidId(senderId))) {
      throw new Error(`Invalid senderId: ${senderId}`);
    }

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

    const botId1 = CONFIG.BOT_ID;
    const botId2 = CONFIG.ADMIN;

    if (botId1 && chat.users.some(user => user.id === botId1)) {
      await this.handleBotResponse(chatId, content, botId1);
    }

    if (botId2 && chat.users.some(user => user.id === botId2)) {
      await this.handleBotResponse(chatId, content, botId2);
    }

    return savedMessage;
  }

  private async createMessage(senderId: string, senderName: string, content: string, chatId: string, senderProfileImageUrl?: string): Promise<Message> {
    return {
      id: await this.messageRepository.generateId(),
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
      content: this.truncateContent(savedMessage.content),
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
        'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg'
      );
      await this.sendMessage(botMessage, chatId);
    }
  }
}