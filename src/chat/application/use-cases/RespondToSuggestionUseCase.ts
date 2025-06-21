import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';
import { CONFIG } from '../../../main/config/config';

interface RespondToSuggestionInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const userProfileImageUrl = user?.profileImageUrl ;

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
    console.log(`Emitted user response message ${userResponseMessage.id} in chat ${chatId}`);

    await delay(800); // Delay to ensure user response appears first

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, suggestion.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(suggestion.suggestedUser._id, userId);

      const botMessages = [
        getTemplatedMessage('suggestionRejected', { senderName }),
        getTemplatedMessage('suggestionRejectedFollowUp1', {}),
        getTemplatedMessage('suggestionRejectedFollowUp2', {}),
      ];

      for (let i = 0; i < botMessages.length; i++) {
        const { text } = botMessages[i];
        const botMessage: BotMessage = {
          id: await this.botMessageRepository.generateId(),
          senderId: this.virtualUserId,
          content: text,
          chatId,
          createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          readBy: [this.virtualUserId, userId], // Include userId in readBy
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
          images: [],
        };
        await this.botMessageRepository.create(botMessage);
        this.socketService.emitMessage(chatId, botMessage);
        console.log(`Emitted bot message ${botMessage.id} in chat ${chatId}: ${text}`);
        await delay(300); // Delay between bot messages
      }

      await delay(800); // Additional delay before image message
      const { text, images } = getTemplatedMessage('suggestionRejectedImages', {});
      const imageBotMessage: BotMessage = {
        id: await this.botMessageRepository.generateId(),
        senderId: this.virtualUserId,
        content: text,
        chatId,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [this.virtualUserId, userId], // Include userId in readBy
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl:CONFIG.BOT_IMAGE_URL,
        images,
      };
      await this.botMessageRepository.create(imageBotMessage);
      this.socketService.emitMessage(chatId, imageBotMessage);
      console.log(`Emitted image bot message ${imageBotMessage.id} in chat ${chatId} with images: ${JSON.stringify(images)}`);

      return { message: botMessages.map(m => m.text).join('\n') };
    }

    const { text: confirmText } = getTemplatedMessage('suggestionAcceptedConfirmation', { suggestedUserName: suggestion.suggestedUser.name });
    const confirmBotMessage: BotMessage = {
      id: await this.botMessageRepository.generateId(),
      senderId: this.virtualUserId,
      content: confirmText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId, userId], // Include userId in readBy
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl:CONFIG.BOT_IMAGE_URL,
      images: [],
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);
    console.log(`Emitted confirmation bot message ${confirmBotMessage.id} in chat ${chatId}`);

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
      id: await this.botMessageRepository.generateId(),
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
      suggestedUserProfileImageUrl: user.profileImageUrl ,
      suggestedUserName: senderName,
      suggestedUserCategory: user.category || 'unknown',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      relatedUserId: userId,
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
      console.log(`Emitted match request message ${matchBotMessage.id} in chat ${suggestedUserChatId}`);
    }

    return { message: confirmText };
  }
}