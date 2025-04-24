import { Chat } from '../entities/Chat';

export interface IChatRepository {
  create(chat: Chat): Promise<Chat>;
  findByUserId(userId: string): Promise<Chat[]>;
  findById(chatId: string): Promise<Chat | null>;
  findByUsers(userIds: string[]): Promise<Chat | null>;
  update(chatId: string, update: Partial<Chat>): Promise<void>;
}