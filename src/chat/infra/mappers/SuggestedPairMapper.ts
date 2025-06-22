import { SuggestedPair } from '../../domain/entities/SuggestedPair';
import { ISuggestedPairMongoose } from '../database/models/SuggestedPairModel';

export function toSuggestedPairDomain(pair: ISuggestedPairMongoose): SuggestedPair {
  return {
    _id: pair._id.toString(),
    userId: pair.userId.toString(),
    suggestedUserId: pair.suggestedUserId.toString(),
    status: pair.status,
    matchType: pair.matchType,
    similarity: pair.similarity,
    reason: pair.reason,
    matchedTextA: pair.matchedTextA,
    matchedTextB: pair.matchedTextB,
    createdAt: pair.createdAt,
  };
}