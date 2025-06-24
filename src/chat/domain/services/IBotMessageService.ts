import { BotMessage } from '../../domain/repo/IBotMessageRepository';

export interface IBotMessageService {
  sendRejectionMessages(chatId: string, senderName: string, virtualUserId: string): Promise<string[]>;
  sendConfirmationMessage(chatId: string, suggestedUserName: string, virtualUserId: string): Promise<string>;
  sendGroupMessages(chatId: string, userName: string, suggestedUserName: string, userCategory: string, suggestedUserCategory: string, botId: string, companyStrengths: string): Promise<void>;
  sendNotificationMessage(chatId: string, userName: string, virtualUserId: string): Promise<void>;
  sendMatchRequestMessage(
    chatId: string,
    senderName: string,
    suggestedUserName: string,
    userCategory: string,
    userId: string,
    profileImageUrl: string | undefined,
    virtualUserId: string,
    recipientId: string
  ): Promise<void>;
}