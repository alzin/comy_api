import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { GenerateBotResponseUseCase } from './GenerateBotResponseUseCase';
import { Message } from '../../domain/entities/Message';
import { LatestMessage } from '../../domain/entities/Chat';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import mongoose from 'mongoose';

export class SendMessageUseCase {
  constructor(
    private messageRepository: IMessageRepository,
    private chatRepository: IChatRepository,
    private socketService: ISocketService,
    private generateBotResponseUseCase: GenerateBotResponseUseCase,
    private userRepository: IUserRepository
  ) {}

  private truncateContent(content: string): string {
    return content.length > 18 ? content.substring(0, 18) : content;
  }

  async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
    const { senderId, content, chatId } = data;

    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error(`Invalid chatId: ${chatId}`);
    }

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
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
    const senderProfileImageUrl = sender.profileImageUrl ;

    const message: Message = {
      id: new mongoose.Types.ObjectId().toString(),
      senderId,
      senderName,
      content,
      chatId,
      readBy: [senderId],
      createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      isMatchCard: false,
      isSuggested: false,
      senderProfileImageUrl
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

    const bot1Id = process.env.BOT_ID;
    const bot2Id = process.env.ADMIN;

    if (bot1Id && chat.users.some(user => user.id === bot1Id)) {
      const botResponse = await this.generateBotResponseUseCase.execute(chatId, content, bot1Id);
      if (botResponse) {
        const botMessage: Message = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: bot1Id,
          senderName: 'COMY オフィシャル AI',
          content: botResponse,
          chatId,
          readBy: [bot1Id],
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          isMatchCard: false,
          isSuggested: false,
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' }
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

    if (bot2Id && chat.users.some(user => user.id === bot2Id)) {
      const botResponse = await this.generateBotResponseUseCase.execute(chatId, content, bot2Id);
      if (botResponse) {
        const botMessage: Message = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: bot2Id,
          senderName: 'COMY オフィシャル AI',
          content: botResponse,
          chatId,
          readBy: [bot2Id],
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          isMatchCard: false,
          isSuggested: false,
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' }
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