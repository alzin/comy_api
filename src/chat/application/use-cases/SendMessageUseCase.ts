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

  async execute(sender: string, content: string, chat: string): Promise<Message> {
    const message: Message = {
      id: new mongoose.Types.ObjectId().toString(),
      sender,
      content,
      chatId: chat,
      readBy: [],
      createdAt: new Date()
    };

    const savedMessage = await this.messageRepository.create(message);
    await this.chatRepository.update(chat, { latestMessage: savedMessage.id });

    // Emit WebSocket notification for the new message
    this.socketService.emitMessage(savedMessage);

    return savedMessage;
  }
}