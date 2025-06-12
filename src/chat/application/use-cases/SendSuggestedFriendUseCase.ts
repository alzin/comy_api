import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { ISuggestedPairRepository } from '../../domain/repo/ISuggestedPairRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';

export class SendSuggestedFriendUseCase {
  constructor(
    private userRepository: IUserRepository,
    private botMessageRepo: IBotMessageRepository,
    private chatRepo: IChatRepository,
    private socketService: ISocketService,
    private suggestedPairRepo: ISuggestedPairRepository,
    private createChatUseCase: CreateChatUseCase,
    private virtualUserId: string
  ) {}

  async execute(): Promise<{ message: string; sentCount: number }> {
    try {
      const pendingPairs = await this.suggestedPairRepo.findPending();
      let sentCount = 0;

      for (const pair of pendingPairs) {
        const userId = pair.userId.toString();
        const suggestedUserId = pair.suggestedUserId.toString();

        const user = await this.userRepository.findById(userId);
        const suggestedUser = await this.userRepository.findById(suggestedUserId);

        if (!user || !suggestedUser) {
          console.error(`User ${userId} or suggestedUser ${suggestedUserId} not found`);
          await this.suggestedPairRepo.updateStatus(pair._id.toString(), 'rejected');
          continue;
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
          continue;
        }

        const replacements = {
          userName: user.name || 'User',
          suggestedUserName: suggestedUser.name || 'Unknown',
          suggestedUserCategory: suggestedUser.category || 'unknown',
        };

        const { text, images } = getTemplatedMessage('suggestedFriendIntro', replacements);

        const botMessage: BotMessage = {
          senderId: this.virtualUserId,
          content: text,
          chatId: chat.id,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
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
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
          relatedUserId: suggestedUserId,
          images: images || [],
        };

        const savedMessage = await this.botMessageRepo.create(botMessage);
        this.socketService.emitMessage(chat.id, savedMessage);

        await this.suggestedPairRepo.updateStatus(pair._id.toString(), 'sent');
        sentCount++;
      }

      return { message: `Sent ${sentCount} suggestion messages successfully`, sentCount };
    } catch (error) {
      console.error('Error sending suggested friends:', error);
      throw new Error('Failed to send suggestion messages');
    }
  }
}