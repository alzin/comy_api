// src/chat/domain/entities/SuggestedPair.ts
export interface SuggestedPair {
  _id: any;
  id?: string;
  userId: any;
  suggestedUserId: any;
  status: 'pending' | 'sent'| 'rejected' ;
  matchType?: string;
  similarity?: number;
  reason?: string;
  matchedTextA?: string;
  matchedTextB?: string;
  createdAt: string;
}