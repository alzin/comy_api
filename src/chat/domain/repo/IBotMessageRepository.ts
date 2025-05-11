///src/chat/domain/repo/IBotMessageRepository.ts
import mongoose from 'mongoose';

export interface BotMessage {
    id: string;
    chatId?: string;
    senderId?: string;
    recipientId?: string;
    suggestedUser?: string;
    suggestionReason?: string;
    status?: 'pending' | 'accepted' | 'rejected';
    content?: string;
    createdAt?: Date;
    sender?: any;
    chat?: string;
    readBy?: string[];
  }

export interface IBotMessageRepository {
  create(message: BotMessage): Promise<void>;
  findByUserAndStatus(userId: string, statuses: string[]): Promise<BotMessage | null>;
  updateSuggestionStatus(messageId: string, status: 'accepted' | 'rejected'): Promise<void>;
  findByChatId(chatId: string): Promise<BotMessage[]>;
}