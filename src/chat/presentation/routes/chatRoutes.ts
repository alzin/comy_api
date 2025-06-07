import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { ISocketService } from '../../domain/services/ISocketService';
import { SuggestFriendsUseCase } from '../../application/use-cases/SuggestFriendsUseCase';
import { RespondToSuggestionUseCase } from '../../application/use-cases/RespondToSuggestionUseCase';
import { RespondToMatchUseCase } from '../../application/use-cases/RespondToMatchUseCase';
import { SendSuggestedFriendUseCase } from '../../application/use-cases/SendSuggestedFriendUseCase';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { MongoFriendRepository } from '../../infra/repo/MongoFriendRepository';
import { MongoSuggestedPairRepository } from '../../infra/repo/MongoSuggestedPairRepository';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMessageRepository } from '../../domain/repo/IMessageRepository';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { CONFIG } from '../../../main/config/config';

interface ChatRouteDependencies {
  userRepository: IUserRepository;
  messageRepository: IMessageRepository;
  chatService: { createChatUseCase: CreateChatUseCase };
  tokenService: any;
  virtualUserId: string;
  adminBotId: string;
}


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

  const sendSuggestedFriendUseCase = new SendSuggestedFriendUseCase(
    dependencies.userRepository,
    botMessageRepo,
    chatRepo,
    socketService,
    suggestedPairRepo,
    dependencies.chatService.createChatUseCase,
    dependencies.virtualUserId
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
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
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
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await sendSuggestedFriendUseCase.execute();
      return res.status(200).json({ message: result.message });
    } catch (error) {
      console.error('Error sending suggested friends:', error);
      return res.status(400).json({ error: 'Failed to send suggestion messages' });
    }
  });

  return router;
};