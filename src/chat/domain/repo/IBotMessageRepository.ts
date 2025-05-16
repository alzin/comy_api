export interface BotMessage {
  id: string;
  chatId?: any;
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
  isMatchCard?: boolean; // إضافة isMatchCard
  suggestedUserProfileImageUrl?: string; // إضافة لحل المشكلة الثانية
}

export interface IBotMessageRepository {
  create(message: BotMessage): Promise<void>;
  findByUserAndStatus(userId: string, statuses: string[]): Promise<BotMessage | null>;
  updateSuggestionStatus(messageId: string, status: 'accepted' | 'rejected'): Promise<void>;
  findByChatId(chatId: string): Promise<BotMessage[]>;
}