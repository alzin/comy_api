export interface BotMessage {
  id: string;
  senderId: string;
  content: string;
  chatId: string;
  createdAt: Date;
  readBy: string[];
  recipientId?: string;
  suggestedUser?: string;
  suggestionReason?: string;
  isMatchCard?: boolean;
  isSuggested?: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface IBotMessageRepository {
  create(message: BotMessage): Promise<void>;
  updateSuggestionStatus(messageId: string, status: 'accepted' | 'rejected'): Promise<void>;
}