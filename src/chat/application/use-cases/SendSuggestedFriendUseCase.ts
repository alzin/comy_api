import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';
import { IBusinessSheetRepository } from '../../../domain/repo/IBusinessSheetRepository';
import { CONFIG } from '../../../main/config/config';

export class SendSuggestedFriendUseCase {
  constructor(
    private userRepository: IUserRepository,
    private botMessageRepo: IBotMessageRepository,
    private chatRepo: IChatRepository,
    private socketService: ISocketService,
    private suggestedPairRepo: ISuggestedPairRepository,
    private createChatUseCase: CreateChatUseCase,
    private virtualUserId: string,
    private businessSheetRepository: IBusinessSheetRepository
  ) {}

  async execute(): Promise<{ message: string; sentCount: number }> {
    try {
      const pendingPairs = await this.suggestedPairRepo.findPending();
      const messagesToSend: { chatId: string; message: BotMessage }[] = [];
      const pairsToUpdate: string[] = [];

      // Process all pairs in parallel
      const results = await Promise.all(
        pendingPairs.map(async (pair) => {
          return await this.processSinglePair(pair);
        })
      );

      // Collect successful messages and pair IDs
      results.forEach((result) => {
        if (result && result.message && result.pairId) {
          messagesToSend.push({ chatId: result.message.chatId, message: result.message });
          pairsToUpdate.push(result.pairId);
        }
      });

      // Send messages in batch and update pair statuses
      if (messagesToSend.length > 0) {
        await this.socketService.emitMessagesBatch(messagesToSend);
        await this.suggestedPairRepo.updateStatusesBatch(pairsToUpdate, 'sent');
      }

      return { message: `Sent ${messagesToSend.length} suggestion messages successfully`, sentCount: messagesToSend.length };
    } catch (error) {
      console.error('Error sending suggested friends:', error);
      throw new Error('Failed to send suggestion messages');
    }
  }

  private async processSinglePair(pair: any): Promise<{ message: BotMessage; pairId: string } | null> {
    const userId = pair.userId.toString();
    const suggestedUserId = pair.suggestedUserId.toString();

    const user = await this.userRepository.findById(userId);
    const suggestedUser = await this.userRepository.findById(suggestedUserId);

    if (!user || !suggestedUser) {
      console.error(`User ${userId} or suggestedUser ${suggestedUserId} not found`);
      await this.suggestedPairRepo.updateStatus(pair._id.toString(), 'rejected');
      return null;
    }

    let chat = await this.chatRepo.findByUsers([userId, this.virtualUserId]);
    if (!chat) {
      chat = await this.createChatUseCase.execute(
        [userId, this.virtualUserId],
        'Private Chat with Virtual Assistant',
        false
      );
    }

    const existingMessage = await this.botMessageRepo.findExistingSuggestion(
      chat.id,
      this.virtualUserId,
      userId,
      suggestedUserId
    );
    if (existingMessage) {
      console.log(`Suggestion already exists for user ${userId} and suggestedUser ${suggestedUserId}`);
      return null;
    }

    const userBusinessSheet = await this.businessSheetRepository.findByUserId(suggestedUserId);

    const replacements = {
      userName: user.name || 'User',
      suggestedUserName: suggestedUser.name || 'Unknown',
      suggestedUserCategory: suggestedUser.category || 'unknown',
      companyStrengths: userBusinessSheet.companyStrengths || '「自社の強みテーブル」'
    };

    const { text, images } = getTemplatedMessage('suggestedFriendIntro', replacements);

    const botMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: text,
      chatId: chat.id,
      createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      readBy: [this.virtualUserId],
      recipientId: userId,
      suggestedUser: {
        _id: suggestedUserId,
        name: suggestedUser.name || '',
        profileImageUrl: suggestedUser.profileImageUrl || '',
        category: suggestedUser.category || 'unknown',
      },
      suggestionReason: 'suggested',
      status: 'pending',
      isMatchCard: true,
      isSuggested: true,
      suggestedUserProfileImageUrl: suggestedUser.profileImageUrl || '',
      suggestedUserName: suggestedUser.name || '',
      suggestedUserCategory: suggestedUser.category || 'unknown',
      senderProfileImageUrl: CONFIG.BOT_IMAGE_URL,
      relatedUserId: suggestedUserId,
      images: images || [],
    };

    const savedMessage = await this.botMessageRepo.create(botMessage);
    return { message: savedMessage, pairId: pair._id.toString() };
  }
}