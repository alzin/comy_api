import { Types } from 'mongoose';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { IBotMessageModel } from '../database/models/BotMessageModel';
import { UserDocument } from '../../../infra/database/models/UserModel';

export function toBotMessageDomain(messageDoc: IBotMessageModel, suggestedUser?: UserDocument): BotMessage {
  return {
    id: messageDoc._id.toString(),
    senderId: messageDoc.senderId.toString(),
    senderName: suggestedUser?.name || 'Unknown', 
    content: messageDoc.content || '',
    chatId: messageDoc.chatId.toString(),
    createdAt: messageDoc.createdAt.toString(),
    readBy: messageDoc.readBy.map((id: Types.ObjectId) => id.toString()),
    recipientId: messageDoc.recipientId?.toString(),
    suggestedUser: suggestedUser
      ? {
          _id: suggestedUser._id.toString(),
          name: messageDoc.suggestedUserName || suggestedUser.name || '',
          profileImageUrl: messageDoc.suggestedUserProfileImageUrl || suggestedUser.profileImageUrl || '',
          category: messageDoc.suggestedUserCategory || suggestedUser.category || '',
        }
      : undefined,
    suggestionReason: messageDoc.suggestionReason,
    status: messageDoc.status as 'pending' | 'accepted' | 'rejected',
    isMatchCard: messageDoc.isMatchCard || false,
    isSuggested: messageDoc.isSuggested || false,
    suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
    suggestedUserName: messageDoc.suggestedUserName,
    suggestedUserCategory: messageDoc.suggestedUserCategory,
    senderProfileImageUrl: messageDoc.senderProfileImageUrl,
    relatedUserId: messageDoc.relatedUserId || (suggestedUser ? suggestedUser._id.toString() : undefined),
    images: messageDoc.images || [],
  };
}