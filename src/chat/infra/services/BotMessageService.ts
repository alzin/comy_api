import { IBotMessageRepository, BotMessage } from '../../domain/repo/IBotMessageRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IBotMessageService } from '../../domain/services/IBotMessageService';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';
import { CONFIG } from '../../../main/config/config';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class BotMessageService implements IBotMessageService {
  constructor(
    private readonly botMessageRepository: IBotMessageRepository,
    private readonly socketService: ISocketService
  ) { }

  async sendRejectionMessages(chatId: string, senderName: string, virtualUserId: string): Promise<string[]> {
    const botMessages = [
      getTemplatedMessage('matchRejected', { senderName }),
      getTemplatedMessage('matchRejectedFollowUp1', {}),
      getTemplatedMessage('matchRejectedFollowUp2', {}),
    ];

    const messageTexts: string[] = [];

    for (let i = 0; i < botMessages.length; i++) {
      const { text } = botMessages[i];
      const botMessage: BotMessage = {
        id: await this.botMessageRepository.generateId(),
        senderId: virtualUserId,
        content: text,
        chatId,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
        images: [],
        senderName: CONFIG.BOT_NAME
      };
      await this.botMessageRepository.create(botMessage);
      this.socketService.emitMessage(chatId, botMessage);
      console.log(`Emitted bot message ${botMessage.id} in chat ${chatId}: ${text}`);
      messageTexts.push(text);
      await delay(300); // Delay between bot messages
    }

    await delay(800); // Additional delay before image message
    const { text, images } = getTemplatedMessage('matchRejectedImages', {});
    const imageBotMessage: BotMessage = {
      id: await this.botMessageRepository.generateId(),
      senderId: virtualUserId,
      content: text,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      images,
      senderName: CONFIG.BOT_NAME
    };
    await this.botMessageRepository.create(imageBotMessage);
    this.socketService.emitMessage(chatId, imageBotMessage);
    console.log(`Emitted image bot message ${imageBotMessage.id} in chat ${chatId} with images: ${JSON.stringify(images)}`);
    messageTexts.push(text);

    return messageTexts;
  }

  async sendConfirmationMessage(chatId: string, suggestedUserName: string, virtualUserId: string): Promise<string> {
    const { text: confirmText } = getTemplatedMessage('matchAcceptedConfirmation', { suggestedUserName });
    const confirmBotMessage: BotMessage = {
      id: await this.botMessageRepository.generateId(),
      senderId: virtualUserId,
      content: confirmText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      images: [],
      senderName: CONFIG.BOT_NAME
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);
    console.log(`Emitted confirmation bot message ${confirmBotMessage.id} in chat ${chatId}`);
    return confirmText;
  }

  async sendGroupMessages(
    chatId: string,
    userName: string,
    suggestedUserName: string,
    userCategory: string,
    suggestedUserCategory: string,
    botId: string,
    suggestedUserCompanyStrengths: string,
    userCompanyStrengths: string
  ): Promise<void> {
    const groupMessages = [
      getTemplatedMessage('matchGroupIntro1', {
        userName,
        suggestedUserName,
        suggestedUserCategory: suggestedUserCategory || '未指定',
        suggestedUserCompanyStrengths: suggestedUserCompanyStrengths || '「自社の強みテーブル」'
      }),
      getTemplatedMessage('matchGroupIntro2', {
        suggestedUserName,
        userName,
        userCategory: userCategory || '未指定',
        userCompanyStrengths: userCompanyStrengths || '「自社の強みテーブル」'
      }),
      getTemplatedMessage('matchGroupIntro3', {}),
    ];

    for (let i = 0; i < groupMessages.length; i++) {
      const { text } = groupMessages[i];
      const botMessage: BotMessage = {
        id: await this.botMessageRepository.generateId(),
        senderId: botId,
        content: text,
        chatId,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [botId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
        images: [],
        senderName: CONFIG.BOT_NAME
      };
      await this.botMessageRepository.create(botMessage);
      this.socketService.emitMessage(chatId, botMessage);
      console.log(`Emitted group bot message ${botMessage.id} in chat ${chatId}: ${text}`);
      await delay(300); // Delay between group messages
    }
  }

  async sendNotificationMessage(chatId: string, userName: string, virtualUserId: string): Promise<void> {
    const { text: notificationText } = getTemplatedMessage('matchNotification', { userName });
    const notifyBotMessage: BotMessage = {
      id: await this.botMessageRepository.generateId(),
      senderId: virtualUserId,
      content: notificationText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      images: [],
      senderName: CONFIG.BOT_NAME
    };
    await this.botMessageRepository.create(notifyBotMessage);
    this.socketService.emitMessage(chatId, notifyBotMessage);
    console.log(`Emitted notification bot message ${notifyBotMessage.id} in chat ${chatId}`);
  }

  async sendMatchRequestMessage(
    chatId: string,
    senderName: string,
    suggestedUserName: string,
    userCategory: string,
    userId: string,
    profileImageUrl: string | undefined,
    virtualUserId: string,
    recipientId: string
  ): Promise<void> {
    const { text: matchMessageText } = getTemplatedMessage('suggestionMatchRequest', {
      suggestedUserName,
      senderName,
      userCategory: userCategory || 'unknown',
    });
    const matchBotMessage: BotMessage = {
      id: await this.botMessageRepository.generateId(),
      senderId: virtualUserId,
      content: matchMessageText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [virtualUserId],
      recipientId,
      suggestedUser: { _id: userId, name: senderName, profileImageUrl, category: userCategory },
      suggestionReason: 'Match request',
      status: 'pending',
      isMatchCard: true,
      isSuggested: false,
      suggestedUserProfileImageUrl: profileImageUrl,
      suggestedUserName: senderName,
      suggestedUserCategory: userCategory || 'unknown',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      relatedUserId: userId,
      images: [],
      senderName: CONFIG.BOT_NAME
    };
    await this.botMessageRepository.create(matchBotMessage);
    this.socketService.emitMessage(chatId, matchBotMessage);
    console.log(`Emitted match request message ${matchBotMessage.id} in chat ${chatId}`);
  }
}