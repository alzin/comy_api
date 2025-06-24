import { Types } from 'mongoose';
import { Message } from '../../domain/entities/Message';
import { IMessageModel } from '../database/models/MessageModel';
import { IBotMessageModel } from '../database/models/BotMessageModel';
import { CONFIG } from '../../../main/config/config';

const BOT_DETAILS = {
  name: CONFIG.BOT_NAME,
  profileImageUrl: CONFIG.BOT_IMAGE_URL,
};

export function toMessageDomain(messageDoc: IMessageModel): Message {
  return {
    id: messageDoc._id.toString(),
    senderId: messageDoc.senderId,
    senderName: messageDoc.senderName,
    content: messageDoc.content || '',
    chatId: messageDoc.chat.toString(),
    createdAt: messageDoc.createdAt.toString(),
    readBy: messageDoc.readBy.map(id => id.toString()),
    isMatchCard: messageDoc.isMatchCard || false,
    isSuggested: messageDoc.isSuggested || false,
    suggestedUserProfileImageUrl: messageDoc.suggestedUserProfileImageUrl,
    suggestedUserName: messageDoc.suggestedUserName,
    suggestedUserCategory: messageDoc.suggestedUserCategory,
    status: messageDoc.status,
    senderProfileImageUrl: messageDoc.senderProfileImageUrl,
    relatedUserId: messageDoc.relatedUserId?.toString(),
    images: messageDoc.images || [],
  };
}

export function toBotMessageDomain(botMsg: IBotMessageModel): Message {
  const relatedUserId = botMsg.suggestedUser
    ? (botMsg.suggestedUser as unknown as Types.ObjectId).toString()
    : botMsg.relatedUserId?.toString();

  return {
    id: botMsg._id.toString(),
    senderId: botMsg.senderId || CONFIG.BOT_ID,
    senderName: BOT_DETAILS.name,
    content: botMsg.content || '',
    chatId: botMsg.chatId.toString(),
    createdAt: botMsg.createdAt.toString(),
    readBy: botMsg.readBy.map(id => id.toString()),
    isMatchCard: botMsg.isMatchCard || false,
    isSuggested: botMsg.isSuggested || false,
    suggestedUserProfileImageUrl: botMsg.suggestedUserProfileImageUrl,
    suggestedUserName: botMsg.suggestedUserName,
    suggestedUserCategory: botMsg.suggestedUserCategory,
    status: botMsg.status,
    senderProfileImageUrl: BOT_DETAILS.profileImageUrl,
    relatedUserId,
    images: botMsg.images || [],
  };
}