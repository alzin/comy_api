export interface Message {
  id: string;
  sender: string;
  senderDetails?: { name: string; email: string; profileImageUrl?: string }; 
  content: string;
  chatId: any;
  createdAt: string; 
  readBy: string[];
  isMatchCard: boolean;
  isSuggested: boolean;
  suggestedUserProfileImageUrl?: string;
  suggestedUserName?: string;
  suggestedUserCategory?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  senderProfileImageUrl?: string;
}