export interface BotMessage {
  id: string;
  senderId: string;
  content: string;
  chatId: string;
  createdAt: string;
  readBy: string[];
  recipientId?: string;
  suggestedUser?: string;
  suggestionReason?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isMatchCard?: boolean;
  isSuggested?: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  senderProfileImageUrl?: string;
  relatedUserId?: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>; 
}

export interface IBotMessageRepository {
  create(botMessage: BotMessage): Promise<BotMessage>;
  findById(id: string): Promise<BotMessage | null>;
  updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void>;
  findExistingSuggestion(chatId: string, senderId: string, recipientId: string, suggestedUserId: string): Promise<BotMessage | null>;
}