////src/chat/domain/services/ISocketService.ts
import { Message } from '../../domain/entities/Message';

export interface ISocketService {
  emitMessage(chatId: string, message: Message): void;
  emitUserStatus(userId: string, isOnline: boolean): void;
  emitTyping(chatId: string, userId: string): void;
  emitStopTyping(chatId: string, userId: string): void;
  emitMessageRead(messageId: string, userId: string): void;
}