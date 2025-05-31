// File: src/chat/domain/repo/ISuggestedPairRepository.ts
import { ISuggestedPair } from '../../infra/database/models/SuggestedPairModel';

export interface ISuggestedPairRepository {
  create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string>;
  findByIds(userId: string, suggestedUserId: string): Promise<ISuggestedPair | null>;
  findPending(): Promise<ISuggestedPair[]>;
  updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void>;
}