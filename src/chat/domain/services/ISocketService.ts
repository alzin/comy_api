import { Message } from '../entities/Message';

export interface ISocketService {
  initialize(): void;
  emitNewMessage(message: Message): void;
  emitUserStatus(userId: string, isOnline: boolean): void;
  emitTyping(chatId: string, userId: string): void;
  emitStopTyping(chatId: string, userId: string): void;
  emitMessageRead(messageId: string, userId: string): void;
}