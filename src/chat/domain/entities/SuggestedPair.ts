// src/chat/domain/entities/SuggestedPair.ts
export interface SuggestedPair {
  _id: string;
  userId: string;
  suggestedUserId: string;
  status: 'pending' | 'sent';
  matchType?: string;
  similarity?: number;
  reason?: string;
  matchedTextA?: string;
  matchedTextB?: string;
  createdAt: string;
}