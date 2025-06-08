///src/chat/domain/repo/IBotMessageRepository.ts
export interface SuggestedUser {
  _id: string;
  name: string;
  profileImageUrl?: string;
  category?: string;
}

export interface BotMessage {
  id?: string; // Optional to match messageService.ts
  senderId: string;
  content: string;
  chatId: string;
  createdAt: string;
  readBy: string[];
  recipientId?: string;
  suggestedUser?: SuggestedUser; 
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
  generateId(): string | PromiseLike<string>;
  createAsync(matchBotMessage: BotMessage): unknown;
  updateStatus(messageId: string, arg1: string): unknown;
  findByIdWithSuggestedUser(messageId: string): Promise<BotMessage | null>;
  create(botMessage: BotMessage): Promise<BotMessage>;
  findById(id: string): Promise<BotMessage | null>;
  updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): Promise<void>;
  updateReadBy(chatId: string, userId: string): Promise<void>;
  findExistingSuggestion(
    chatId: string,
    senderId: string,
    recipientId: string,
    suggestedUserId: string
  ): Promise<BotMessage | null>;
}