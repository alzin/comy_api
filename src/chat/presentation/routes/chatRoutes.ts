import express from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';

const router = express.Router();

export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  dependencies: any
) => {
  router.use(authMiddleware(dependencies.tokenService, dependencies.userRepository));

  router.post('/', (req, res) => chatController.createChat(req, res));
  router.get('/', (req, res) => chatController.getUserChats(req, res));
  router.get('/:chatId/messages', (req, res) => messageController.getMessages(req, res));
  router.post('/messages', (req, res) => messageController.sendMessage(req, res));

  return router;
};