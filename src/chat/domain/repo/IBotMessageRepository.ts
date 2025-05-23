export interface BotMessage {
  id: string;
  senderId: string;
  content: string;
  chatId: string;
  createdAt?: string;
  readBy: string[];
  recipientId?: string;
  suggestedUser?: string;
  suggestionReason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  senderProfileImageUrl?: string; 
}

export interface IBotMessageRepository {
  create(botMessage: BotMessage): Promise<void>;
  findById(id: string): Promise<BotMessage | null>;
  updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void>;
}