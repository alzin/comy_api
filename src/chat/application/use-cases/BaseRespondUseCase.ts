import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IBlacklistRepository } from '../../domain/repo/IBlacklistRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { CreateChatUseCase } from './CreateChatUseCase';
import { IBotMessageService } from '../../domain/services/IBotMessageService';

interface RespondInput {
  messageId: string;
  response: 'マッチを希望する' | 'マッチを希望しない';
  userId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export abstract class BaseRespondUseCase {
  constructor(
    protected readonly botMessageRepository: IBotMessageRepository,
    protected readonly blacklistRepository: IBlacklistRepository,
    protected readonly chatRepository: IChatRepository,
    protected readonly socketService: ISocketService,
    protected readonly userRepository: any,
    protected readonly createChatUseCase: CreateChatUseCase,
    protected readonly virtualUserId: string,
    protected readonly messageRepository: IMessageRepository,
    protected readonly botMessageService: IBotMessageService
  ) {}

  protected async validateInput(input: RespondInput): Promise<void> {
    const { response } = input;
    if (!['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      throw new Error('Invalid response');
    }
  }

  protected async fetchSuggestion(messageId: string): Promise<{ suggestion: BotMessage; suggestedUser: SuggestedUser; chatId: string }> {
    const suggestion = await this.botMessageRepository.findByIdWithSuggestedUser(messageId);
    if (!suggestion || !suggestion.suggestedUser || suggestion.status !== 'pending') {
      throw new Error('Invalid or already processed suggestion');
    }
    const chatId = suggestion.chatId;
    if (!chatId) {
      throw new Error('Invalid chat ID');
    }
    return { suggestion, suggestedUser: suggestion.suggestedUser, chatId };
  }

  protected async updateSuggestionStatus(messageId: string, chatId: string, userId: string, response: string): Promise<void> {
    await this.botMessageRepository.updateReadBy(chatId, userId);
    await this.botMessageRepository.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');
  }

  protected async sendUserResponse(input: RespondInput, chatId: string): Promise<void> {
    const { userId, response } = input;
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
  }

  protected async handleRejection(userId: string, suggestedUserId: string, chatId: string, senderName: string): Promise<string> {
    await this.blacklistRepository.addToBlacklist(userId, suggestedUserId);
    await this.blacklistRepository.addToBlacklist(suggestedUserId, userId);

    const rejectionMessages = await this.botMessageService.sendRejectionMessages(chatId, senderName, this.virtualUserId);
    return rejectionMessages.join('\n');
  }

  protected async sendConfirmationMessage(chatId: string, suggestedUserName: string): Promise<string> {
    return this.botMessageService.sendConfirmationMessage(chatId, suggestedUserName, this.virtualUserId);
  }

  abstract execute(input: RespondInput): Promise<{ message: string; chatId?: string }>;
}