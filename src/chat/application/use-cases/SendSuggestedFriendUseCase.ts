import mongoose from 'mongoose';
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IChatRepository } from '../../domain/repo/IChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { MongoSuggestedPairRepository } from '../../infra/repo/MongoSuggestedPairRepository';
import { CreateChatUseCase } from './CreateChatUseCase';
import { getTemplatedMessage } from '../../config/MessageContentTemplates';

export class SendSuggestedFriendUseCase {
  constructor(
    private userRepository: IUserRepository,
    private botMessageRepo: IBotMessageRepository,
    private chatRepo: IChatRepository,
    private socketService: ISocketService,
    private suggestedPairRepo: MongoSuggestedPairRepository,
    private createChatUseCase: CreateChatUseCase,
    private virtualUserId: string
  ) {}

  private async sendBotMessage(
    templateKey: string,
    chatId: string,
    additionalFields: Partial<BotMessage>,
    replacements: { [key: string]: string }
  ) {
    const { text, images } = getTemplatedMessage(templateKey, replacements);
    const botMessage: BotMessage = {
      senderId: this.virtualUserId,
      content: text,
      chatId,
      createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      readBy: [this.virtualUserId],
      isMatchCard: false,
      isSuggested: false,
      status: 'pending',
      senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg',
      images: images || [],
      ...additionalFields,
    };
    console.log(`Sending bot message to chat ${chatId}: ${text}`);
    await this.botMessageRepo.create(botMessage);
    this.socketService.emitMessage(chatId, botMessage);
  }

  async execute(): Promise<{ message: string; sentCount: number }> {
    try {
      const pendingPairs = await this.suggestedPairRepo.findPending();
      let sentCount = 0;

      for (const pair of pendingPairs) {
        let userId: string;
        let suggestedUserId: string;

        if (typeof pair.userId === 'string') {
          userId = pair.userId;
        } else if (pair.userId instanceof mongoose.Types.ObjectId) {
          userId = pair.userId.toString();
        } else if (typeof pair.userId === 'object' && pair.userId !== null && '_id' in pair.userId) {
          userId = (pair.userId as { _id: mongoose.Types.ObjectId })._id.toString();
        } else {
          console.error(`Invalid userId format: ${JSON.stringify(pair.userId)}`);
          continue;
        }

        if (typeof pair.suggestedUserId === 'string') {
          suggestedUserId = pair.suggestedUserId;
        } else if (pair.suggestedUserId instanceof mongoose.Types.ObjectId) {
          suggestedUserId = pair.suggestedUserId.toString();
        } else if (typeof pair.suggestedUserId === 'object' && pair.suggestedUserId !== null && '_id' in pair.suggestedUserId) {
          suggestedUserId = (pair.suggestedUserId as { _id: mongoose.Types.ObjectId })._id.toString();
        } else {
          console.error(`Invalid suggestedUserId format: ${JSON.stringify(pair.suggestedUserId)}`);
          continue;
        }

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
        console.log(`Preparing suggestion for user ${user.name} (ID: ${userId}) with suggested user ${suggestedUser.name} (ID: ${suggestedUserId})`);

        await this.sendBotMessage(
          'suggestedFriendIntro',
          chat.id,
          {
            recipientId: userId,
            suggestedUser: {
              _id: suggestedUserId,
              name: suggestedUser.name || '',
              profileImageUrl: suggestedUser.profileImageUrl || '',
              category: suggestedUser.category || 'unknown',
            } as SuggestedUser,
            suggestionReason: 'suggested',
            status: 'pending',
            isMatchCard: true,
            isSuggested: true,
            suggestedUserProfileImageUrl: suggestedUser.profileImageUrl || '',
            suggestedUserName: suggestedUser.name || '',
            suggestedUserCategory: suggestedUser.category || 'unknown',
          },
          replacements
        );

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