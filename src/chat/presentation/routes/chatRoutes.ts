// src/chat/presentation/routes/chatRoutes.ts
import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { ISocketService } from '../../domain/services/ISocketService';
import { SuggestFriendsUseCase } from '../../application/use-cases/SuggestFriendsUseCase';
import { RespondToSuggestionUseCase } from '../../application/use-cases/RespondToSuggestionUseCase';
import { RespondToMatchUseCase } from '../../application/use-cases/RespondToMatchUseCase';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { MongoFriendRepository } from '../../infra/repo/MongoFriendRepository';
import { MongoSuggestedPairRepository } from '../../infra/repo/MongoSuggestedPairRepository';
import { IBotMessageRepository, BotMessage, SuggestedUser } from '../../domain/repo/IBotMessageRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import mongoose from 'mongoose';

interface ChatRouteDependencies {
  userRepository: IUserRepository;
  messageRepository: IMessageRepository;
  chatService: { createChatUseCase: CreateChatUseCase };
  tokenService: any; // TODO: Replace with ITokenService
  virtualUserId: string;
  adminBotId: string;
}

const sendBotMessage = async (
  content: string,
  chatId: string,
  virtualUserId: string,
  socketService: ISocketService,
  botMessageRepo: IBotMessageRepository,
  additionalFields: Partial<BotMessage>
) => {
  const botMessage: BotMessage = {
    senderId: virtualUserId,
    content,
    chatId,
    createdAt: new Date().toISOString(),
    readBy: [virtualUserId],
    isMatchCard: false,
    isSuggested: false,
    status: 'pending',
    senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png',
    ...additionalFields,
  };
  await botMessageRepo.create(botMessage);
  socketService.emitMessage(chatId, botMessage);
};

export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  dependencies: ChatRouteDependencies,
  socketService: ISocketService
) => {
  const botMessageRepo = new MongoBotMessageRepository();
  const blacklistRepo = new MongoBlacklistRepository();
  const chatRepo = new MongoChatRepository();
  const friendRepo = new MongoFriendRepository();
  const suggestedPairRepo = new MongoSuggestedPairRepository();

  const suggestFriendsUseCase = new SuggestFriendsUseCase(
    dependencies.userRepository,
    botMessageRepo,
    chatRepo,
    blacklistRepo,
    friendRepo,
    dependencies.chatService.createChatUseCase,
    socketService,
    suggestedPairRepo,
    dependencies.virtualUserId
  );

  const respondToSuggestionUseCase = new RespondToSuggestionUseCase(
    botMessageRepo,
    blacklistRepo,
    chatRepo,
    socketService,
    dependencies.userRepository,
    dependencies.chatService.createChatUseCase,
    dependencies.virtualUserId,
    dependencies.messageRepository
  );

  const respondToMatchUseCase = new RespondToMatchUseCase(
    botMessageRepo,
    blacklistRepo,
    chatRepo,
    friendRepo,
    socketService,
    dependencies.userRepository,
    dependencies.chatService.createChatUseCase,
    dependencies.virtualUserId,
    dependencies.adminBotId,
    dependencies.messageRepository
  );

  const router = express.Router();

  router.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.path === '/suggest-friends' || req.path === '/send-suggested-friend') {
      return next();
    }
    return authMiddleware(dependencies.tokenService, dependencies.userRepository)(req, res, next);
  });

  router.post('/', (req: Request, res: Response) => chatController.createChat(req, res));
  router.get('/', (req: Request, res: Response) => chatController.getUserChats(req, res));
  router.get('/:chatId/messages', (req: Request, res: Response) => messageController.getMessages(req, res));
  router.post('/messages', (req: Request, res: Response) => messageController.sendMessage(req, res));

  router.post('/suggestions/respond', async (req: Request, res: Response) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const result = await respondToSuggestionUseCase.execute({ messageId, response, userId });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error responding to suggestion:', error);
      return res.status(400).json({ error: 'Failed to respond to suggestion' });
    }
  });

  router.post('/matches/respond', async (req: Request, res: Response) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const result = await respondToMatchUseCase.execute({ messageId, response, userId });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error responding to match:', error);
      return res.status(400).json({ error: 'Failed to respond to match' });
    }
  });

  router.post('/suggest-friends', async (req: Request, res: Response) => {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    try {
      await suggestFriendsUseCase.execute();
      return res.status(200).json({ message: 'Friend suggestions stored successfully' });
    } catch (error) {
      console.error('Error triggering friend suggestions:', error);
      return res.status(400).json({ error: 'Failed to trigger friend suggestions' });
    }
  });

router.post('/send-suggested-friend', async (req: Request, res: Response) => {
  const apiKey = req.header('X-API-Key');
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pendingPairs = await suggestedPairRepo.findPending();
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

      const user = await dependencies.userRepository.findById(userId);
      const suggestedUser = await dependencies.userRepository.findById(suggestedUserId);

      if (!user || !suggestedUser) {
        await suggestedPairRepo.updateStatus(pair._id.toString(), 'rejected');
        continue;
      }

      let chat = await chatRepo.findByUsers([userId, dependencies.virtualUserId]);
      if (!chat) {
        chat = await dependencies.chatService.createChatUseCase.execute(
          [userId, dependencies.virtualUserId],
          'Private Chat with Virtual Assistant',
          false
        );
      }

      const existingMessage = await botMessageRepo.findExistingSuggestion(
        chat.id,
        dependencies.virtualUserId,
        userId,
        suggestedUserId
      );
      if (existingMessage) {
        continue;
      }

      const suggestionContent = `${user.name}さん、おはようございます！今週は${user.name}さんにおすすめの方で${suggestedUser.category || 'unknown'}カテゴリーの${suggestedUser.name}さんをご紹介します！\n${suggestedUser.category || 'unknown'}カテゴリーの${suggestedUser.name}さんの強みは「自社の強みテーブル」です。\nお繋がり希望しますか？`;
      await sendBotMessage(
        suggestionContent,
        chat.id,
        dependencies.virtualUserId,
        socketService,
        botMessageRepo,
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
          suggestedUserName: suggestedUser.name,
          suggestedUserCategory: suggestedUser.category || 'unknown',
        }
      );

      await suggestedPairRepo.updateStatus(pair._id.toString(), 'sent');
      sentCount++;
    }

    return res.status(200).json({ message: `Sent ${sentCount} suggestion messages successfully` });
  } catch (error) {
    console.error('Error sending suggested friends:', error);
    return res.status(400).json({ error: 'Failed to send suggestion messages' });
  }
});
  return router;
};