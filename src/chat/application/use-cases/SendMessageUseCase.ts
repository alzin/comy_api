import mongoose from 'mongoose';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';

export class SendMessageUseCase {
  constructor(
    private messageRepository: IMessageRepository,
    private chatRepository: IChatRepository,
    private socketService: ISocketService
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

    const message: Message = {
      id: new mongoose.Types.ObjectId().toString(),
      sender: senderId,
      content,
      chatId,
      readBy: [senderId],
      createdAt: new Date()
    };

    const savedMessage = await this.messageRepository.create(message);
    await this.chatRepository.update(chatId, { latestMessage: savedMessage.id });

    // Emit WebSocket notification for the new message
    this.socketService.emitMessage(savedMessage);

    return savedMessage;
  }
}