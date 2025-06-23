import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';

import { RespondTregarController } from '../controllers/RespondTregarController';
import { SuggestFriendController } from '../controllers/SuggestFriendController';


export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  respondTregarController: RespondTregarController,
  suggestFriendController: SuggestFriendController
) => {

  const router = express.Router();

  router.post('/', (req: Request, res: Response) => chatController.createChat(req, res));
  router.get('/', (req: Request, res: Response) => chatController.getUserChats(req, res));
  router.get('/:chatId/messages', (req: Request, res: Response) => messageController.getMessages(req, res));
  router.post('/messages', (req: Request, res: Response) => messageController.sendMessage(req, res));

  router.post('/suggestions/respond', async (req: Request, res: Response) => respondTregarController.ToSuggestion(req, res));

  router.post('/matches/respond', async (req: Request, res: Response) => respondTregarController.ToMatch(req, res));

  router.post('/suggest-friends', async (req: Request, res: Response) => suggestFriendController.store(req, res));

  router.post('/send-suggested-friend', async (req: Request, res: Response) => suggestFriendController.send(req, res));

  return router;
};