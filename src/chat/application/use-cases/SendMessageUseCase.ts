import mongoose from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { VirtualChatService } from '../../infra/services/VirtualChatService';
import { Message } from '../../domain/entities/Message';

export class SendMessageUseCase {
  constructor(
    private messageRepository: IMessageRepository,
    private chatRepository: IChatRepository,
    private socketService: ISocketService,
    private virtualChatService: VirtualChatService
  ) {}

  async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
    const { senderId, content, chatId } = data;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error('Invalid sender or chat ID');
    }
    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    // Check if chat exists
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Create user message
    const message: Message = {
      id: new mongoose.Types.ObjectId().toString(),
      sender: senderId,
      content,
      chatId,
      readBy: [senderId],
      createdAt: new Date(),
      isMatchCard: false,
      isSuggested: false
    };

    const savedMessage = await this.messageRepository.create(message);
    await this.chatRepository.update(chatId, { latestMessage: savedMessage.id });

    // Emit WebSocket notification for the new message
    this.socketService.emitMessage(chatId, savedMessage);

    const bot1Id = '681547798892749fbe910c02';
    const bot2Id = '681c757539ec003942b3f97e';

    if (chat.users.includes(bot1Id)) {
      const botResponse = await this.virtualChatService.generateBotResponse(chatId, content, bot1Id);
      if (botResponse) {
        const botMessage: Message = {
          id: new mongoose.Types.ObjectId().toString(),
          sender: bot1Id,
          content: botResponse,
          chatId,
          readBy: [bot1Id],
          createdAt: new Date(),
          isMatchCard: false,
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          isSuggested: false
        };
        const savedBotMessage = await this.messageRepository.create(botMessage);
        await this.chatRepository.update(chatId, { latestMessage: savedBotMessage.id });
        this.socketService.emitMessage(chatId, savedBotMessage);
      }
    }

    if (chat.users.includes(bot2Id)) {
      const botResponse = await this.virtualChatService.generateBotResponse(chatId, content, bot2Id);
      if (botResponse) {
        const botMessage: Message = {
          id: new mongoose.Types.ObjectId().toString(),
          sender: bot2Id,
          content: botResponse,
          chatId,
          readBy: [bot2Id],
          createdAt: new Date(),
          isMatchCard: false,
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          isSuggested: false
        };
        const savedBotMessage = await this.messageRepository.create(botMessage);
        await this.chatRepository.update(chatId, { latestMessage: savedBotMessage.id });
        this.socketService.emitMessage(chatId, savedBotMessage);
      }
    }

    return savedMessage;
  }
}