import { Message } from '../../../chat/domain/entities/Message';

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]>;
  updateReadBy(messageId: string, userId: string): Promise<void>;
}