import { ISuggestedPair } from '../../infra/database/models/SuggestedPairModel';

export interface ISuggestedPairRepository {
  findPendingWithValidIds(): Promise<ISuggestedPair[]>;
  create(suggestion: { userId: string; suggestedUserId: string; status: 'pending' | 'sent' | 'rejected' }): Promise<string>;
  findByIds(userId: string, suggestedUserId: string): Promise<ISuggestedPair | null>;
  findPending(): Promise<ISuggestedPair[]>;
  updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<void>;
}