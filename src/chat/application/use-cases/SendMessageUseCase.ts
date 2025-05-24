import mongoose from 'mongoose';
  import { IMessageRepository } from '../../domain/repo/IMessageRepository';
  import { IChatRepository } from '../../domain/repo/IChatRepository';
  import { ISocketService } from '../../domain/services/ISocketService';
  import { VirtualChatService } from '../../infra/services/VirtualChatService';
  import { Message } from '../../domain/entities/Message';
  import { LatestMessage } from '../../domain/entities/Chat';

  export class SendMessageUseCase {
    constructor(
      private messageRepository: IMessageRepository,
      private chatRepository: IChatRepository,
      private socketService: ISocketService,
      private virtualChatService: VirtualChatService
    ) {}

    private truncateContent(content: string): string {
      return content.length > 18 ? content.substring(0, 18) : content;
    }

    async execute(data: { senderId: string; content: string; chatId: string }): Promise<Message> {
      const { senderId, content, chatId } = data;

      if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error('Invalid sender or chat ID');
      }
      if (!content || content.trim() === '') {
        throw new Error('Message content cannot be empty');
      }

      const chat = await this.chatRepository.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const message: Message = {
        id: new mongoose.Types.ObjectId().toString(),
        sender: senderId,
        content,
        chatId,
        readBy: [senderId],
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }), // JST
        isMatchCard: false,
        isSuggested: false
      };

      const savedMessage = await this.messageRepository.create(message);
      const latestMessage: LatestMessage = {
        id: savedMessage.id,
        content: this.truncateContent(savedMessage.content),
        createdAt: savedMessage.createdAt,
      };
      await this.chatRepository.update(chatId, { latestMessage });

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
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }), // JST
            isMatchCard: false,
            senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
            isSuggested: false
          };
          const savedBotMessage = await this.messageRepository.create(botMessage);
          const botLatestMessage: LatestMessage = {
            id: savedBotMessage.id,
            content: this.truncateContent(savedBotMessage.content),
            createdAt: savedBotMessage.createdAt,
          };
          await this.chatRepository.update(chatId, { latestMessage: botLatestMessage });
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
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }), // JST
            isMatchCard: false,
            senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
            isSuggested: false
          };
          const savedBotMessage = await this.messageRepository.create(botMessage);
          const botLatestMessage: LatestMessage = {
            id: savedBotMessage.id,
            content: this.truncateContent(savedBotMessage.content),
            createdAt: savedBotMessage.createdAt,
          };
          await this.chatRepository.update(chatId, { latestMessage: botLatestMessage });
          this.socketService.emitMessage(chatId, savedBotMessage);
        }
      }

      return savedMessage;
    }
  }