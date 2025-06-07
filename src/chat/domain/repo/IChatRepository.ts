import { Chat } from '../entities/Chat';

export interface IChatRepository {
  findById(chatId: string): Promise<Chat | null>;
  create(chat: Chat): Promise<Chat>;
  findByUserId(userId: string): Promise<Chat[]>;
  findByUsers(userIds: string[]): Promise<Chat | null>;
  getPrivateChatId(userId: string, virtualUserId: string): Promise<string | null>;
  update(chatId: string, update: Partial<Chat>): Promise<void>;
  isValidId(id: string): Promise<boolean>;
}