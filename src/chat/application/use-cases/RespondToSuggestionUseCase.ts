// src/chat/application/use-cases/RespondToSuggestionUseCase.ts
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';

interface RespondToSuggestionInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

export class RespondToSuggestionUseCase {
  constructor(
    private botMessageRepository: IBotMessageRepository,
    private blacklistRepository: IBlacklistRepository,
    private chatRepository: IChatRepository,
    private socketService: ISocketService,
    private userRepository: any, 
    private createChatUseCase: CreateChatUseCase,
    private virtualUserId: string,
    private messageRepository: IMessageRepository
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
    const userProfileImageUrl = user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';

    const userResponseMessage: Message = {
      senderId: userId,
      senderName,
      content: response,
      chatId,
      createdAt: new Date().toISOString(),
      readBy: [userId],
      isMatchCard: false,
      isSuggested: false,
      senderProfileImageUrl: userProfileImageUrl,
    };
    await this.messageRepository.create(userResponseMessage);
    this.socketService.emitMessage(chatId, userResponseMessage);

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, suggestion.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(suggestion.suggestedUser._id, userId);

      const botMessages = [
        `マッチングを却下しました。${senderName}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`,
        `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`,
        `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`,
      ];

      for (const content of botMessages) {
        const botMessage: BotMessage = {
          senderId: this.virtualUserId,
          content,
          chatId,
          createdAt: new Date().toISOString(),
          readBy: [this.virtualUserId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
        };
        await this.botMessageRepository.create(botMessage);
        this.socketService.emitMessage(chatId, botMessage);
      }

      const imageBotMessage: BotMessage = {
        senderId: this.virtualUserId,
        content: '',
        chatId,
        createdAt: new Date().toISOString(),
        readBy: [this.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
        images: [
          { imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', zoomLink: 'https://zoom.us/j/business-sheet-meeting' },
          { imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470', zoomLink: 'https://zoom.us/j/virtual-meeting' },
        ],
      };
      await this.botMessageRepository.create(imageBotMessage);
      this.socketService.emitMessage(chatId, imageBotMessage);

      return { message: botMessages.join('\n') };
    }

    const confirmBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: `${suggestion.suggestedUser.name}さんにマッチの希望を送りました。`,
      chatId,
      createdAt: new Date().toISOString(),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);

    let suggestedUserChatId = await this.chatRepository.getPrivateChatId(suggestion.suggestedUser._id, this.virtualUserId);
    if (!suggestedUserChatId) {
      const newChat = await this.createChatUseCase.execute(
        [suggestion.suggestedUser._id, this.virtualUserId],
        `Private Chat with Virtual Assistant`,
        false
      );
      suggestedUserChatId = newChat.id;
    }

    const matchMessageContent = `${suggestion.suggestedUser.name}さん、おはようございます！\n${suggestion.suggestedUser.name}さんに${user.category || 'unknown'}カテゴリーの${senderName}さんからマッチの希望が届いています。\nお繋がりを希望しますか？`;
    const matchBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: matchMessageContent,
      chatId: suggestedUserChatId,
      createdAt: new Date().toISOString(),
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
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
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

    return { message: `${suggestion.suggestedUser.name}さんにマッチの希望を送りました。` };
  }
}