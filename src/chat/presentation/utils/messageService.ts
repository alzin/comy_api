// src/chat/presentation/utils/messageService.ts
import { ISocketService } from '../../domain/services/ISocketService';
import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';

export const sendBotMessage = async (
  content: string,
  chatId: string,
  senderId: string,
  socketService: ISocketService,
  botMessageRepo: IBotMessageRepository,
  additionalOptions: Partial<BotMessage> = {}
): Promise<void> => {
  const botMessage: BotMessage = {
    senderId,
    content,
    chatId,
    createdAt: new Date().toISOString(),
    readBy: [senderId],
    isMatchCard: false,
    isSuggested: false,
    status: 'pending',
    senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
    ...additionalOptions,
  };
  await botMessageRepo.create(botMessage);
  socketService.emitMessage(chatId, botMessage);
};