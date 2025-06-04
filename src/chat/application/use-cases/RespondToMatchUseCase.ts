import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from './../../config/MessageContentTemplates';

// Helper function to add delay
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface RespondToMatchInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

export class RespondToMatchUseCase {
  constructor(
    private readonly botMessageRepository: IBotMessageRepository,
    private readonly blacklistRepository: IBlacklistRepository,
    private readonly chatRepository: IChatRepository,
    private readonly friendRepository: IFriendRepository,
    private readonly socketService: ISocketService,
    private readonly userRepository: any,
    private readonly createChatUseCase: CreateChatUseCase,
    private readonly virtualUserId: string,
    private readonly adminBotId: string,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: RespondToMatchInput): Promise<{ message: string; chatId?: string }> {
    const { messageId, response, userId } = input;

    if (!['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      throw new Error('Invalid response');
    }

    const matchRequest = await this.botMessageRepository.findByIdWithSuggestedUser(messageId);
    if (!matchRequest || !matchRequest.suggestedUser || matchRequest.status !== 'pending') {
      throw new Error('Invalid or already processed match request');
    }

    const chatId = matchRequest.chatId;
    if (!chatId) {
      throw new Error('Invalid chat ID');
    }

    await this.botMessageRepository.updateReadBy(chatId, userId);
    await this.botMessageRepository.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

    const user = await this.userRepository.findById(userId);
    const senderName = user?.name || 'Unknown User';
    const userProfileImageUrl = user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';

    const userResponse: Message = {
      id: await this.messageRepository.generateId(),
      senderId: userId,
      senderName,
      content: response,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [userId],
      isMatchCard: false,
      isSuggested: false,
      senderProfileImageUrl: userProfileImageUrl,
      images: [],
    };
    await this.messageRepository.create(userResponse);
    this.socketService.emitMessage(chatId, userResponse);

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, matchRequest.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(matchRequest.suggestedUser._id, userId);

      const botMessages = [
        getTemplatedMessage('matchRejected', { senderName }),
        getTemplatedMessage('matchRejectedFollowUp1', {}),
        getTemplatedMessage('matchRejectedFollowUp2', {}),
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
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
          images: [],
        };
        await this.botMessageRepository.create(botMessage);
        this.socketService.emitMessage(chatId, botMessage);
        await delay(350); // Increased to 350ms delay
      }

      const { text, images } = getTemplatedMessage('matchRejectedImages', {});
      const imageBotMessage: BotMessage = {
        senderId: this.virtualUserId,
        content: text,
        chatId,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [this.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
        images,
      };
      await this.botMessageRepository.create(imageBotMessage);
      this.socketService.emitMessage(chatId, imageBotMessage);
      await delay(350); // Add 350ms delay after images

      return { message: botMessages.map(m => m.text).join('\n') };
    }

    await this.friendRepository.addFriend(userId, matchRequest.suggestedUser._id);

    const { text: confirmText } = getTemplatedMessage('matchAcceptedConfirmation', { suggestedUserName: matchRequest.suggestedUser.name });
    const confirmBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: confirmText,
      chatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
      images: [],
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);

    const users = [userId, matchRequest.suggestedUser._id, this.adminBotId];
    const chatName = `${user.name || 'User'}, ${matchRequest.suggestedUser.name}`;
    const newChat = await this.createChatUseCase.execute(users, chatName, true);

    const groupMessages = [
      getTemplatedMessage('matchGroupIntro2', {
        suggestedUserName: matchRequest.suggestedUser.name,
        userName: user.name || 'User',
        userCategory: user.category || '未指定',
      }),
      getTemplatedMessage('matchGroupIntro1', {
        userName: user.name || 'User',
        suggestedUserName: matchRequest.suggestedUser.name,
        suggestedUserCategory: matchRequest.suggestedUser.category || '未指定',
      }),
      getTemplatedMessage('matchGroupIntro3', {}),
    ];

    for (let i = 0; i < groupMessages.length; i++) {
      const { text } = groupMessages[i];
      const botMessage: BotMessage = {
        senderId: this.adminBotId,
        content: text,
        chatId: newChat.id,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [this.adminBotId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
        images: [],
      };
      await this.botMessageRepository.create(botMessage);
      this.socketService.emitMessage(newChat.id, botMessage);
      await delay(350); // Keep 350ms delay for group messages
    }

    let notifyChatId = await this.chatRepository.getPrivateChatId(matchRequest.suggestedUser._id, this.virtualUserId);
    if (!notifyChatId) {
      const newChat = await this.createChatUseCase.execute(
        [matchRequest.suggestedUser._id, this.virtualUserId],
        `Private Chat with Virtual Assistant`,
        false
      );
      notifyChatId = newChat.id;
    }

    const { text: notificationText } = getTemplatedMessage('matchNotification', { userName: user.name || 'Unknown' });
    const notifyBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: notificationText,
      chatId: notifyChatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
      images: [],
    };
    await this.botMessageRepository.create(notifyBotMessage);
    this.socketService.emitMessage(notifyChatId, notifyBotMessage);

    return {
      message: confirmText,
      chatId: newChat.id,
    };
  }
}