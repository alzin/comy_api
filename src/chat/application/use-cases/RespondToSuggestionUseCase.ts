// File: RespondToSuggestionUseCase.ts
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from './../../config/MessageContentTemplates';

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface RespondToSuggestionInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

export class RespondToSuggestionUseCase {
  constructor(
    private readonly botMessageRepository: IBotMessageRepository,
    private readonly blacklistRepository: IBlacklistRepository,
    private readonly chatRepository: IChatRepository,
    private readonly socketService: ISocketService,
    private readonly userRepository: any,
    private readonly createChatUseCase: CreateChatUseCase,
    private readonly virtualUserId: string,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: RespondToSuggestionInput): Promise<{ message: string; chatId?: string }> {
    const { messageId, response, userId } = input;

    if (!['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      throw new Error('Invalid response');
    }

    const suggestion = await this.botMessageRepository.findByIdWithSuggestedUser(messageId);
    if (!suggestion || !suggestion.suggestedUser || suggestion.status !== 'pending') {
      throw new Error('Invalid or already processed suggestion');
    }

    const chatId = suggestion.chatId;
    if (!chatId) {
      throw new Error('Invalid chat ID');
    }

    await this.botMessageRepository.updateReadBy(chatId, userId);
    await this.botMessageRepository.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

    const user = await this.userRepository.findById(userId);
    const senderName = user?.name || 'Unknown User';
    const userProfileImageUrl = user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/image/300px.png';

    const userResponseMessage: Message = {
      id: await this.messageRepository.generateId(),
      senderId: userId,
      senderName,
      content: response,
      chatId,
      readBy: [userId],
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      isMatchCard: false,
      isSuggested: false,
      senderProfileImageUrl: userProfileImageUrl,
      images: [],
    };
    await this.messageRepository.create(userResponseMessage);
    this.socketService.emitMessage(chatId, userResponseMessage);

    await delay(350);

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, suggestion.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(suggestion.suggestedUser._id, userId);

      const botMessages = [
        getTemplatedMessage('suggestionRejected', { senderName }),
        getTemplatedMessage('suggestionRejectedFollowUp1', {}),
        getTemplatedMessage('suggestionRejectedFollowUp2', {}),
      ];

      for (const { text } of botMessages) {
        const botMessage: BotMessage = {
          senderId: this.virtualUserId,
          content: text,
          chatId,
          createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          readBy: [this.virtualUserId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/images/bot.png',
          images: [],
        };
        await this.botMessageRepository.create(botMessage);
        this.socketService.emitMessage(chatId, botMessage);
        await delay(350);
      }

      const { text, images } = getTemplatedMessage('suggestionRejectedImages', {});
      const imageBotMessage: BotMessage = {
        senderId: this.virtualUserId,
        content: text,
        chatId,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [this.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://images-comy-test.s3.ap-northeast-1.amazonaws.com/bot-image.png',
        images,
      };
      await this.botMessageRepository.create(imageBotMessage);
      this.socketService.emitMessage(chatId, imageBotMessage);
      await delay(350);

      return { message: botMessages.map(m => m.text).join('\n') };
    }

    const { text: confirmText } = getTemplatedMessage('suggestionAcceptedConfirmation', { suggestedUserName: suggestion.suggestedUser.name });
    const confirmBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: confirmText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
      images: [],
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);

    let suggestedUserChatId = await this.chatRepository.getPrivateChatId(suggestion.suggestedUser._id, this.virtualUserId);
    if (!suggestedUserChatId) {
      const newChat = await this.createChatUseCase.execute(
        [suggestion.suggestedUser._id, this.virtualUserId],
        `Private Chat with Virtual User`,
        false
      );
      suggestedUserChatId = newChat.id;
    }

    const { text: matchMessageText } = getTemplatedMessage('suggestionMatchRequest', {
      suggestedUserName: suggestion.suggestedUser.name,
      senderName,
      userCategory: user.category || 'unknown',
    });
    const matchBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: matchMessageText,
      chatId: suggestedUserChatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      recipientId: suggestion.suggestedUser._id,
      suggestedUser: { _id: userId, name: senderName, profileImageUrl: user.profileImageUrl, category: user.category },
      suggestionReason: 'Match request',
      status: 'pending',
      isMatchCard: true,
      isSuggested: false,
      suggestedUserProfileImageUrl: user.profileImageUrl || '',
      suggestedUserName: senderName,
      suggestedUserCategory: user.category || 'unknown',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/images/bot.png',
      images: [],
    };

    const existingMessage = await this.botMessageRepository.findExistingSuggestion(
      suggestedUserChatId,
      this.virtualUserId,
      suggestion.suggestedUser._id,
      userId
    );
    if (!existingMessage) {
      await this.botMessageRepository.create(matchBotMessage);
      this.socketService.emitMessage(suggestedUserChatId, matchBotMessage);
    }

    return { message: confirmText };
  }
}