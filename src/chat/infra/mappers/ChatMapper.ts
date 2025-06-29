import { Types, Document } from 'mongoose';
import { Chat, LatestMessage, ChatUser } from '../../domain/entities/Chat';
import { IChatModel } from '../database/models/ChatModel';
import { IMessageModel } from '../database/models/MessageModel';
import { IBotMessageModel } from '../database/models/BotMessageModel';
import { CONFIG } from '../../../main/config/config';

interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  profileImageUrl: string;
}

type PopulatedChatDocument = Document<unknown, {}, IChatModel> & IChatModel & {
  users: PopulatedUser[];
  __v: number;
};

type MessageDocument = 
  | (Document<unknown, {}, IMessageModel> & IMessageModel & Required<{ _id: Types.ObjectId; }> & { __v: number; })
  | (Document<unknown, {}, IBotMessageModel> & IBotMessageModel & Required<{ _id: Types.ObjectId; }> & { __v: number; });

export function mapToLatestMessage(messageDoc: MessageDocument | null): LatestMessage | null {
  if (!messageDoc) return null;

  return {
    id: messageDoc._id.toString(),
    content: messageDoc.content || '',
    createdAt: messageDoc.createdAt.toString(),
    readBy: messageDoc.readBy.map(id => id.toString()),
  };
}

export function mapToChatUser(user: PopulatedUser | Types.ObjectId, botId: string, adminId: string): ChatUser {
  const isPopulated = (u: any): u is PopulatedUser => 'name' in u;
  const userId = isPopulated(user) ? user._id.toString() : user.toString();

  const role = userId === botId ? 'bot' : userId === adminId ? 'admin' : 'user';

  return {
    id: userId,
    role,
    name: isPopulated(user) ? user.name || 'Unknown User' : 'Unknown User',
    image: isPopulated(user) ? user.profileImageUrl || '' : '',
  };
}

export function mapToChatDomain(
  chatDoc: IChatModel | PopulatedChatDocument,
  latestMessage: LatestMessage | null,
  botId: string,
): Chat {
  const users = chatDoc.users.map(user => mapToChatUser(user, botId, CONFIG.ADMIN));

  return {
    id: chatDoc._id.toString(),
    name: chatDoc.name,
    isGroup: chatDoc.isGroupChat,
    users,
    createdAt: chatDoc.createdAt.toString(),
    updatedAt: chatDoc.updatedAt.toString(),
    latestMessage,
  };
}