import { Message } from '../../domain/entities/Message';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';

export class SendMessageUseCase {
  constructor(
    private messageRepository: IMessageRepository,
    private chatRepository: IChatRepository,
    private socketService: ISocketService
  ) {}

  async execute(chatId: string, content: string, senderId: string): Promise<Message> {
    const message: Message = {
      sender: senderId,
      content,
      chat: chatId,
      readBy: [senderId],
    };

    const savedMessage = await this.messageRepository.create(message);
    await this.chatRepository.update(chatId, { latestMessage: savedMessage.id });
    this.socketService.emitNewMessage(savedMessage);

    return savedMessage;
  }
}