import { Message } from '../entities/Message';

export interface IMessageRepository {
  create(message: Message, userId?: string): Promise<Message>;
  findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]>;
  updateReadBy(messageId: string, userId: string): Promise<void>;
  generateId(): Promise<string>;
  updateReadByForChat(chatId: string, userId: string): Promise<void>
}