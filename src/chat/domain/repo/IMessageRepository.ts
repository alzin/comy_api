import { Message } from '../../../chat/domain/entities/Message';

export interface IMessageRepository {
  create(message: Message, userId?: string): Promise<Message>; // Add userId parameter to match MongoMessageRepository
  findByChatId(chatId: string, page?: number, limit?: number): Promise<Message[]>;
  updateReadBy(messageId: string, userId: string): Promise<void>;
  updateReadByForChat(chatId: string, userId: string): Promise<void>; // Added
}