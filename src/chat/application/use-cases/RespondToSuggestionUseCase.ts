import { IBotMessageRepository, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { BaseRespondUseCase } from './BaseRespondUseCase';
import { IBotMessageService } from '../../domain/services/IBotMessageService';
import { CONFIG } from '../../../main/config/config';

interface RespondToSuggestionInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class RespondToSuggestionUseCase extends BaseRespondUseCase {
  constructor(
    botMessageRepository: IBotMessageRepository,
    blacklistRepository: IBlacklistRepository,
    chatRepository: IChatRepository,
    socketService: ISocketService,
    userRepository: any,
    createChatUseCase: CreateChatUseCase,
    virtualUserId: string,
    messageRepository: IMessageRepository,
    botMessageService: IBotMessageService
  ) {
    super(botMessageRepository, blacklistRepository, chatRepository, socketService, userRepository, createChatUseCase, virtualUserId, messageRepository, botMessageService);
  }

  async execute(input: RespondToSuggestionInput): Promise<{ message: string; chatId?: string }> {
    const { messageId, response, userId } = input;

    await this.validateInput(input);
    const { suggestion, suggestedUser, chatId } = await this.fetchSuggestion(messageId);
    await this.updateSuggestionStatus(messageId, chatId, userId, response);
    await this.sendUserResponse(input, chatId);

    if (response === 'マッチを希望しない') {
      return { message: await this.handleRejection(userId, suggestedUser._id, chatId, suggestion.senderName || 'Unknown User') };
    }

    const confirmText = await this.sendConfirmationMessage(chatId, suggestedUser.name);

    let suggestedUserChatId = await this.chatRepository.getPrivateChatId(suggestedUser._id, this.virtualUserId);
    if (!suggestedUserChatId) {
      const newChat = await this.createChatUseCase.execute(
        [suggestedUser._id, this.virtualUserId],
        CONFIG.BOT_NAME,
        false
      );
      suggestedUserChatId = newChat.id;
    }

    const user = await this.userRepository.findById(userId);
    const existingMessage = await this.botMessageRepository.findExistingSuggestion(
      suggestedUserChatId,
      this.virtualUserId,
      suggestedUser._id,
      userId
    );

    if (!existingMessage) {
      await this.botMessageService.sendMatchRequestMessage(
        suggestedUserChatId,
        user.name || 'Unknown User',
        suggestedUser.name,
        user.category || 'unknown',
        userId,
        user.profileImageUrl,
        this.virtualUserId,
        suggestedUser._id
      );
    }

    return { message: confirmText };
  }
}