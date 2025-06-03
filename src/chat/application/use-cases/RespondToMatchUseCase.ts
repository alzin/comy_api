import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';

interface RespondToMatchInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

export class RespondToMatchUseCase {
  constructor(
    private botMessageRepository: IBotMessageRepository,
    private blacklistRepository: IBlacklistRepository,
    private chatRepository: IChatRepository,
    private friendRepository: IFriendRepository,
    private socketService: ISocketService,
    private userRepository: any, // TODO: Replace with IUserRepository
    private createChatUseCase: CreateChatUseCase,
    private virtualUserId: string,
    private adminBotId: string,
    private messageRepository: IMessageRepository 
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
        id: ''
    };
    await this.messageRepository.create(userResponseMessage);
    this.socketService.emitMessage(chatId, userResponseMessage);

    if (response === 'マッチを希望しない') {
      await this.blacklistRepository.addToBlacklist(userId, matchRequest.suggestedUser._id);
      await this.blacklistRepository.addToBlacklist(matchRequest.suggestedUser._id, userId);

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

    await this.friendRepository.addFriend(userId, matchRequest.suggestedUser._id);

    const confirmBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: `${matchRequest.suggestedUser.name}さんとのビジネスマッチができました。チャットで挨拶してみましょう。`,
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

    const users = [userId, matchRequest.suggestedUser._id, this.adminBotId];
    const chatName = `${user.name || 'User'}, ${matchRequest.suggestedUser.name}`;
    const newChat = await this.createChatUseCase.execute(users, chatName, true);

    const groupMessages = [
      `${user.name || 'User'}さん、お世話になっております！こちら${matchRequest.suggestedUser.category || '未指定'}カテゴリーの${matchRequest.suggestedUser.name}さんをご紹介します！${matchRequest.suggestedUser.category || '未指定'}カテゴリーの${matchRequest.suggestedUser.name}さんの強みは“自社の強みテーブル”です！`,
      `${matchRequest.suggestedUser.name}さん、お世話になっております！こちら${user.category || '未指定'}カテゴリーの${user.name || 'User'}さんをご紹介します！${user.category || '未指定'}カテゴリーの${user.name || 'User'}さんの強みは”自社の強みテーブル”です！`,
      `是非お二人でお話をしてみてください！`,
    ];

    for (const content of groupMessages) {
      const botMessage: BotMessage = {
        senderId: this.adminBotId,
        content,
        chatId: newChat.id,
        createdAt: new Date().toISOString(),
        readBy: [this.adminBotId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
      };
      await this.botMessageRepository.create(botMessage);
      this.socketService.emitMessage(newChat.id, botMessage);
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

    const notificationMessageContent = `${user.name || 'Unknown'}さんとのビジネスマッチができました。チャットで挨拶してみましょう！`;
    const notifyBotMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: notificationMessageContent,
      chatId: notifyChatId,
      createdAt: new Date().toISOString(),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
    };
    await this.botMessageRepository.create(notifyBotMessage);
    this.socketService.emitMessage(notifyChatId, notifyBotMessage);

    return {
      message: `${matchRequest.suggestedUser.name}さんとのビジネスマッチができました。チャットで挨拶してみましょう。`,
      chatId: newChat.id,
    };
  }
}