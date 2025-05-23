export interface Message {
  id: string;
  sender: string;
  senderDetails?: { name: string; email: string };
  content: string;
  chatId: any;
  createdAt: Date;
  readBy: string[];
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}