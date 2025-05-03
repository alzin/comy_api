import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { Message } from '../../domain/entities/Message';
import mongoose from 'mongoose';
import { BotMessageModel } from '/Users/lubna/Desktop/comy_back_new/comy_api/src/chat/infra/database/models/models/BotMessageModel';
import Chat from '../../infra/database/models/ChatModel';

const router = express.Router();

// Set up chat routes
export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  dependencies: any,
  socketService: ISocketService
) => {
  const botMessageRepo = new MongoBotMessageRepository();
  const blacklistRepo = new MongoBlacklistRepository();
  const chatRepo = new MongoChatRepository();

  // Apply authentication middleware to all routes except /suggest-friends
  router.use((req, res, next) => {
    if (req.path === '/suggest-friends') {
      return next();
    }
    return authMiddleware(dependencies.tokenService, dependencies.userRepository)(req, res, next);
  });

  // Create a new chat
  router.post('/', (req, res) => chatController.createChat(req, res));
  // Retrieve user chats
  router.get('/', (req, res) => chatController.getUserChats(req, res));
  // Retrieve messages for a specific chat
  router.get('/:chatId/messages', (req, res) => messageController.getMessages(req, res));
  // Send a new message
  router.post('/messages', (req, res) => messageController.sendMessage(req, res));

  // Endpoint for accepting/rejecting friend suggestions
  router.post('/suggestions/respond', async (req, res) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['accept', 'reject'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const message = await BotMessageModel.findById(messageId);
      if (!message || !message.suggestedUser) {
        return res.status(404).json({ message: 'Suggestion not found' });
      }

      if (message.status !== 'pending') {
        return res.status(400).json({ message: 'Suggestion already processed' });
      }

      console.log(`User ${userId} responded to suggestion ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'accept' ? 'accepted' : 'rejected');

      if (response === 'reject') {
        // Add suggested user to user's blacklist (mutual block)
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser.toString(), userId);
        console.log(`Added ${message.suggestedUser.toString()} to blacklist of ${userId} and vice versa`);
        return res.json({ message: 'Suggestion rejected and users added to blacklist' });
      }

      // Send match request to the suggested user
      const suggestedUserChatId = await chatRepo.getPrivateChatId(message.suggestedUser.toString(), dependencies.virtualUserId);
      if (!suggestedUserChatId) {
        console.log(`Failed to find chat for suggested user ${message.suggestedUser.toString()}`);
        return res.status(500).json({ message: 'Failed to find chat for suggested user' });
      }

      const matchMessageContent = `${req.user.name} has accepted the suggestion to connect with you! 😊 Would you like to start a conversation?`;
      const matchBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId],
        recipientId: message.suggestedUser.toString(),
        suggestedUser: userId,
        suggestionReason: 'Match request',
        status: 'pending'
      };

      await botMessageRepo.create(matchBotMessage);

      const matchMessage: Message = {
        id: matchBotMessage.id,
        sender: dependencies.virtualUserId,
        senderDetails: { name: 'Virtual Bot', email: 'virtual@chat.com' },
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId]
      };

      socketService.emitMessage(matchMessage);
      console.log(`Sent match request to ${message.suggestedUser.toString()} for user ${userId}`);
      res.json({ message: 'Suggestion accepted, match request sent' });
    } catch (error) {
      console.error('Error responding to suggestion:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Endpoint for accepting/rejecting match requests
  router.post('/matches/respond', async (req, res) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['accept', 'reject'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const message = await BotMessageModel.findById(messageId);
      if (!message || !message.suggestedUser) {
        return res.status(404).json({ message: 'Match request not found' });
      }

      if (message.status !== 'pending') {
        return res.status(400).json({ message: 'Match request already processed' });
      }

      console.log(`User ${userId} responded to match request ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'accept' ? 'accepted' : 'rejected');

      if (response === 'reject') {
        // Add suggested user to user's blacklist (mutual block)
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser.toString(), userId);
        console.log(`Added ${message.suggestedUser.toString()} to blacklist of ${userId} and vice versa`);
        return res.json({ message: 'Match request rejected and users added to blacklist' });
      }

      // Create a new chat between users
      const newChat = await Chat.create({
        name: `Chat between ${req.user.name} and ${message.suggestedUser}`,
        isGroupChat: false,
        users: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(message.suggestedUser)
        ]
      });

      const notificationMessageContent = `Match request approved! A new chat has started between you. 😊`;
      const notifyUsers = [userId, message.suggestedUser.toString()];

      for (const notifyUserId of notifyUsers) {
        const notifyChatId = await chatRepo.getPrivateChatId(notifyUserId, dependencies.virtualUserId);
        if (notifyChatId) {
          const notifyBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content: notificationMessageContent,
            chatId: notifyChatId,
            createdAt: new Date(),
            readBy: [dependencies.virtualUserId]
          };

          await botMessageRepo.create(notifyBotMessage);

          const notifyMessage: Message = {
            id: notifyBotMessage.id,
            sender: dependencies.virtualUserId,
            senderDetails: { name: 'Virtual Bot', email: 'virtual@chat.com' },
            content: notificationMessageContent,
            chatId: notifyChatId,
            createdAt: new Date(),
            readBy: [dependencies.virtualUserId]
          };

          socketService.emitMessage(notifyMessage);
          console.log(`Sent notification to ${notifyUserId} for new chat ${newChat._id.toString()}`);
        }
      }

      res.json({ message: 'Match accepted, new chat created', chatId: newChat._id.toString() });
    } catch (error) {
      console.error('Error responding to match:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Endpoint for triggering friend suggestions with API Key
  router.post('/suggest-friends', async (req: Request, res: Response) => {
    try {
      const apiKey = req.header('X-API-Key');
      if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Invalid or missing API Key' });
      }

      const virtualChatService = req.app.locals.dependencies.virtualChatService;
      await virtualChatService.suggestFriends();
      return res.status(200).json({ message: 'Friend suggestions triggered successfully' });
    } catch (error) {
      console.error('Error triggering friend suggestions:', error);
      return res.status(500).json({ error: 'Failed to trigger friend suggestions' });
    }
  });

  return router;
};