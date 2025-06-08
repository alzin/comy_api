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
  ) { }

  private truncateContent(content: string): string {
    return content.length > 20 ? content.substring(0, 20) : content;
  }

  async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
    const { senderId, content, chatId } = data;

    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    // Validate IDs using repository methods
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

    const message: Message = {
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

    const savedMessage = await this.messageRepository.create(message);
    const latestMessage: LatestMessage = {
      id: savedMessage.id,
      content: this.truncateContent(savedMessage.content),
      createdAt: savedMessage.createdAt,
      readBy: savedMessage.readBy,
    };
    await this.chatRepository.update(chatId, { latestMessage });

    this.socketService.emitMessage(chatId, savedMessage);

    const botId1 = CONFIG.BOT_ID;
    const botId2 = CONFIG.ADMIN;

    if (botId1 && chat.users.some(user => user.id === botId1)) {
      const botResponse = await this.generateBotResponseUseCase.execute(chatId, content, botId1);
      if (botResponse) {
        const botMessage: Message = {
          id: await this.messageRepository.generateId(),
          senderId: botId1,
          senderName: 'COMY オフィシャル AI',
          content: botResponse,
          chatId,
          readBy: [botId1],
          createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          isMatchCard: false,
          isSuggested: false,
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
        };
        const savedBotMessage = await this.messageRepository.create(botMessage);
        const botLatestMessage: LatestMessage = {
          id: savedBotMessage.id,
          content: this.truncateContent(savedBotMessage.content),
          createdAt: savedBotMessage.createdAt,
          readBy: savedBotMessage.readBy,
        };
        await this.chatRepository.update(chatId, { latestMessage: botLatestMessage });
        this.socketService.emitMessage(chatId, savedBotMessage);
      }
    }

    if (botId2 && chat.users.some(user => user.id === botId2)) {
      const botResponse = await this.generateBotResponseUseCase.execute(chatId, content, botId2);
      if (botResponse) {
        const botMessage: Message = {
          id: await this.messageRepository.generateId(),
          senderId: botId2,
          senderName: 'COMY オフィシャル AI',
          content: botResponse,
          chatId,
          readBy: [botId2],
          createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          isMatchCard: false,
          isSuggested: false,
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
        };
        const savedBotMessage = await this.messageRepository.create(botMessage);
        const botLatestMessage: LatestMessage = {
          id: savedBotMessage.id,
          content: this.truncateContent(savedBotMessage.content),
          createdAt: savedBotMessage.createdAt,
          readBy: savedBotMessage.readBy,
        };
        await this.chatRepository.update(chatId, { latestMessage: botLatestMessage });
        this.socketService.emitMessage(chatId, savedBotMessage);
      }
    }

    return savedMessage;
  }
}