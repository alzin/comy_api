////src/chat/presentation/utils/messageService.ts
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
    createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    readBy: [senderId],
    isMatchCard: false,
    isSuggested: false,
    status: 'pending',
    senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
    relatedUserId: additionalOptions.relatedUserId || (additionalOptions.isSuggested && additionalOptions.suggestedUser?._id ? additionalOptions.suggestedUser._id : undefined),
    ...additionalOptions,
  };

  if (botMessage.isSuggested && !botMessage.relatedUserId) {
    throw new Error('relatedUserId is required for suggestion messages');
  }

  console.log('sendBotMessage: Creating bot message:', {
    id: botMessage.id,
    chatId: botMessage.chatId,
    relatedUserId: botMessage.relatedUserId,
    suggestedUser: botMessage.suggestedUser?._id,
    isSuggested: botMessage.isSuggested,
  });

  const savedMessage = await botMessageRepo.create(botMessage);

  socketService.emitMessage(chatId, savedMessage);
};