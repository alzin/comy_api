import { Message } from '../../../chat/domain/entities/Message';

export interface IMessageRepository {
  create(message: Message, userId?: string): Promise<Message>; 
  findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]>;
  updateReadBy(messageId: string, userId: string): Promise<void>;
  updateReadByForChat(chatId: string, userId: string): Promise<void>; 
}