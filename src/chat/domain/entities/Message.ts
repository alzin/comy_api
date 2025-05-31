export interface Message {
  id: string;
  senderId: string;
  senderName: string;
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
  relatedUserId?: string; 
  status?: 'pending' | 'accepted' | 'rejected';
  senderProfileImageUrl?: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}