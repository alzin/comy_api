// src/chat/domain/entities/Message.ts
export interface Message {
  id: string;
  sender: string;
  senderDetails?: { name: string; email: string };
  content: string;
  chatId: any;
  createdAt: Date;
  readBy?: string[];
  suggestedUserProfileImageUrl?: string;
  isMatchCard?: boolean;
}