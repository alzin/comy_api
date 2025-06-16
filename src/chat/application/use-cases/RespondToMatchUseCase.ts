import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';

interface RespondToMatchInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  ) { }

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
    const userProfileImageUrl = user?.profileImageUrl;

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
    console.log(`Emitted user response message ${userResponse.id} in chat ${chatId}`);

    await delay(800); // Delay to ensure user response appears first

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, matchRequest.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(matchRequest.suggestedUser._id, userId);

      const botMessages = [
        getTemplatedMessage('matchRejected', { senderName }),
        getTemplatedMessage('matchRejectedFollowUp1', {}),
        getTemplatedMessage('matchRejectedFollowUp2', {}),
      ];

      for (let i = 0; i < botMessages.length; i++) {
        const { text } = botMessages[i];
        const botMessage: BotMessage = {
          id: await this.botMessageRepository.generateId(),
          senderId: this.virtualUserId,
          content: text,
          chatId,
          createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          readBy: [this.virtualUserId, userId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
          images: [],
        };
        await this.botMessageRepository.create(botMessage);
        this.socketService.emitMessage(chatId, botMessage);
        console.log(`Emitted bot message ${botMessage.id} in chat ${chatId}: ${text}`);
        await delay(300); // Delay between bot messages
      }

      await delay(800); // Additional delay before image message
      const { text, images } = getTemplatedMessage('matchRejectedImages', {});
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
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
        images,
      };
      await this.botMessageRepository.create(imageBotMessage);
      this.socketService.emitMessage(chatId, imageBotMessage);
      console.log(`Emitted image bot message ${imageBotMessage.id} in chat ${chatId} with images: ${JSON.stringify(images)}`);

      return { message: botMessages.map(m => m.text).join('\n') };
    }

    await this.friendRepository.addFriend(userId, matchRequest.suggestedUser._id);

    const { text: confirmText } = getTemplatedMessage('matchAcceptedConfirmation', { suggestedUserName: matchRequest.suggestedUser.name });
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
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
      images: [],
    };
    await this.botMessageRepository.create(confirmBotMessage);
    this.socketService.emitMessage(chatId, confirmBotMessage);
    console.log(`Emitted confirmation bot message ${confirmBotMessage.id} in chat ${chatId}`);

    const users = [userId, matchRequest.suggestedUser._id, this.adminBotId];
    const chatName = `${user.name || 'User'}, ${matchRequest.suggestedUser.name}`;
    const newChat = await this.createChatUseCase.execute(users, chatName, true);

    const groupMessages = [
      getTemplatedMessage('matchGroupIntro1', {
        userName: user.name || 'User',
        suggestedUserName: matchRequest.suggestedUser.name,
        suggestedUserCategory: matchRequest.suggestedUser.category || '未指定',
      }),
      getTemplatedMessage('matchGroupIntro2', {
        suggestedUserName: matchRequest.suggestedUser.name,
        userName: user.name || 'User',
        userCategory: user.category || '未指定',
      }),
      getTemplatedMessage('matchGroupIntro3', {}),
    ];

    for (let i = 0; i < groupMessages.length; i++) {
      const { text } = groupMessages[i];
      const botMessage: BotMessage = {
        id: await this.botMessageRepository.generateId(),
        senderId: this.adminBotId,
        content: text,
        chatId: newChat.id,
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        readBy: [this.adminBotId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
        images: [],
      };
      await this.botMessageRepository.create(botMessage);
      this.socketService.emitMessage(newChat.id, botMessage);
      console.log(`Emitted group bot message ${botMessage.id} in chat ${newChat.id}: ${text}`);
      await delay(300); // Delay between group messages
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
      id: await this.botMessageRepository.generateId(),
      senderId: this.virtualUserId,
      content: notificationText,
      chatId: notifyChatId,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
      images: [],
    };
    await this.botMessageRepository.create(notifyBotMessage);
    this.socketService.emitMessage(notifyChatId, notifyBotMessage);
    console.log(`Emitted notification bot message ${notifyBotMessage.id} in chat ${notifyChatId}`);

    return {
      message: confirmText,
      chatId: newChat.id,
    };
  }
}