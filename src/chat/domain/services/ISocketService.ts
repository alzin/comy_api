////src/chat/domain/services/ISocketService.ts
import { Message } from '../../domain/entities/Message';
import { BotMessage } from '../repo/IBotMessageRepository';

export interface ISocketService {
  emitUserStatus(userId: string, isOnline: boolean): void;
  emitTyping(chatId: string, userId: string): void;
  emitStopTyping(chatId: string, userId: string): void;
  emitMessageRead(messageId: string, userId: string): void;
  emitMessage(chatId: string, message: Message | BotMessage): void;
}
