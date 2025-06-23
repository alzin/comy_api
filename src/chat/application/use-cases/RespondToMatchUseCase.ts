import { IBotMessageRepository, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { IFriendRepository } from '../../domain/repo/IFriendRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { BaseRespondUseCase } from './BaseRespondUseCase';
import { IBotMessageService } from '../../domain/services/IBotMessageService';

interface RespondToMatchInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class RespondToMatchUseCase extends BaseRespondUseCase {
  constructor(
    botMessageRepository: IBotMessageRepository,
    blacklistRepository: IBlacklistRepository,
    chatRepository: IChatRepository,
    socketService: ISocketService,
    userRepository: any,
    createChatUseCase: CreateChatUseCase,
    virtualUserId: string,
    private readonly friendRepository: IFriendRepository,
    private readonly adminBotId: string,
    messageRepository: IMessageRepository,
    botMessageService: IBotMessageService
  ) {
    super(botMessageRepository, blacklistRepository, chatRepository, socketService, userRepository, createChatUseCase, virtualUserId, messageRepository, botMessageService);
  }

  async execute(input: RespondToMatchInput): Promise<{ message: string; chatId?: string }> {
    const { messageId, response, userId } = input;

    await this.validateInput(input);
    const { suggestion, suggestedUser, chatId } = await this.fetchSuggestion(messageId);
    await this.updateSuggestionStatus(messageId, chatId, userId, response);
    await this.sendUserResponse(input, chatId);

    if (response === 'マッチを希望しない') {
      return { message: await this.handleRejection(userId, suggestedUser._id, chatId, suggestion.senderName || 'Unknown User') };
    }

    await this.friendRepository.addFriend(userId, suggestedUser._id);
    const confirmText = await this.sendConfirmationMessage(chatId, suggestedUser.name);

    const user = await this.userRepository.findById(userId);
    const users = [userId, suggestedUser._id, this.adminBotId];
    const chatName = `${user.name || 'User'}, ${suggestedUser.name}`;
    const newChat = await this.createChatUseCase.execute(users, chatName, true);

    await this.botMessageService.sendGroupMessages(
      newChat.id,
      user.name || 'User',
      suggestedUser.name,
      user.category || '未指定',
      suggestedUser.category || '未指定',
      this.adminBotId
    );

    let notifyChatId = await this.chatRepository.getPrivateChatId(suggestedUser._id, this.virtualUserId);
    if (!notifyChatId) {
      const newNotifyChat = await this.createChatUseCase.execute(
        [suggestedUser._id, this.virtualUserId],
        `Private Chat with Virtual Assistant`,
        false
      );
      notifyChatId = newNotifyChat.id;
    }

    await this.botMessageService.sendNotificationMessage(notifyChatId, user.name || 'Unknown', this.virtualUserId);

    return {
      message: confirmText,
      chatId: newChat.id,
    };
  }
}