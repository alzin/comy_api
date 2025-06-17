// src/chat/domain/repo/ISuggestedPairRepository.ts
import { SuggestedPair } from '../entities/SuggestedPair';
export interface ISuggestedPairRepository {
  findPendingWithValidIds(): Promise<SuggestedPair[]>;
  create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string>;
  findByIds(userId: string, suggestedUserId: string): Promise<SuggestedPair | null>;
  findPending(): Promise<SuggestedPair[]>;
  updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void>;
  updateStatusesBatch(pairIds: string[], status: 'pending' | 'sent'): Promise<void>;
}