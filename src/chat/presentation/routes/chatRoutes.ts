import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import mongoose from 'mongoose';
import BotMessageModel from '../../../chat/infra/database/models/models/BotMessageModel';
import { UserModel } from '../../../infra/database/models/UserModel';

const router = express.Router();

export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  dependencies: any,
  socketService: ISocketService
) => {
  const botMessageRepo = new MongoBotMessageRepository();
  const blacklistRepo = new MongoBlacklistRepository();
  const chatRepo = new MongoChatRepository();

  router.use((req, res, next) => {
    if (req.path === '/suggest-friends') {
      return next();
    }
    return authMiddleware(dependencies.tokenService, dependencies.userRepository)(req, res, next);
  });

  router.post('/', (req, res) => chatController.createChat(req, res));
  router.get('/', (req, res) => chatController.getUserChats(req, res));
  router.get('/:chatId/messages', (req, res) => messageController.getMessages(req, res));
  router.post('/messages', (req, res) => messageController.sendMessage(req, res));

  router.post('/suggestions/respond', async (req: Request, res: Response) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const message = await BotMessageModel.findById(messageId).populate<{
        suggestedUser: { _id: mongoose.Types.ObjectId; name: string; profileImageUrl?: string; category?: string }
      }>('suggestedUser', 'profileImageUrl name category');
      if (!message || !message.suggestedUser) {
        console.log(`Suggestion message not found or no suggested user for messageId: ${messageId}`);
        return res.status(404).json({ message: 'Suggestion not found' });
      }

      if (message.status !== 'pending') {
        console.log(`Suggestion already processed for messageId: ${messageId}, status: ${message.status}`);
        return res.status(400).json({ message: 'Suggestion already processed' });
      }

      const chatId = message.chatId?.toString();
      if (!chatId) {
        console.error(`ChatId is null for suggestion message ${messageId}`);
        return res.status(500).json({ message: 'Invalid chat ID' });
      }

      console.log(`User ${userId} responded to suggestion ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

      const userResponseMessage: Message = {
        id: new mongoose.Types.ObjectId().toString(),
        sender: userId,
        content: response,
        chatId,
        createdAt: new Date(),
        readBy: [userId],
        isMatchCard: false,
        isSuggested: false
      };
      await dependencies.messageRepository.create(userResponseMessage);
      socketService.emitMessage(chatId, userResponseMessage);
      console.log(`Created user response message: ${userResponseMessage.id} in chat ${chatId}`);

      if (response === 'マッチを希望しない') {
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser._id.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser._id.toString(), userId);
        console.log(`Added ${message.suggestedUser._id.toString()} to blacklist of ${userId} and vice versa`);

        const rejectMessages = [
          `マッチングを却下しました。${message.suggestedUser.name}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`,
          `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`,
          `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
        ];

        for (const content of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content,
            chatId,
            createdAt: new Date(),
            readBy: [dependencies.virtualUserId],
            isMatchCard: false,
            isSuggested: false,
            status: 'pending'
          };
          await botMessageRepo.create(rejectBotMessage);

          const rejectMessage: Message = {
            id: rejectBotMessage.id,
            sender: dependencies.virtualUserId,
            senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
            content: rejectBotMessage.content || '',
            chatId,
            createdAt: rejectBotMessage.createdAt!,
            readBy: rejectBotMessage.readBy,
            isMatchCard: rejectBotMessage.isMatchCard ?? false,
            isSuggested: rejectBotMessage.isSuggested ?? false
          };
          socketService.emitMessage(chatId, rejectMessage);
          console.log(`Created rejection bot message: ${rejectBotMessage.id} in chat ${chatId}`);
        }

        return res.status(200).json({ message: rejectMessages });
      }

      const confirmBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: `${message.suggestedUser.name}さんにマッチの希望を送りました。`,
        chatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false, // Set to false for bot response to suggestion
        status: 'pending'
      };
      await botMessageRepo.create(confirmBotMessage);
      const confirmMessage: Message = {
        id: confirmBotMessage.id,
        sender: dependencies.virtualUserId,
        senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
        content: confirmBotMessage.content || '',
        chatId,
        createdAt: confirmBotMessage.createdAt!,
        readBy: confirmBotMessage.readBy,
        isMatchCard: confirmBotMessage.isMatchCard ?? false,
        isSuggested: confirmBotMessage.isSuggested ?? false
      };
      socketService.emitMessage(chatId, confirmMessage);
      console.log(`Created confirmation bot message: ${confirmBotMessage.id} in chat ${chatId}`);

      let suggestedUserChatId: string | null = await chatRepo.getPrivateChatId(message.suggestedUser._id.toString(), dependencies.virtualUserId);
      if (!suggestedUserChatId) {
        console.log(`Creating new chat for suggested user ${message.suggestedUser._id.toString()} with virtual user ${dependencies.virtualUserId}`);
        const newChat = await dependencies.chatService.createChatUseCase.execute(
          [message.suggestedUser._id.toString(), dependencies.virtualUserId],
          `Private Chat with Virtual Assistant`,
          false
        );
        suggestedUserChatId = newChat.id;
        console.log(`Created new chat: ${suggestedUserChatId}`);
      }

      if (!suggestedUserChatId) {
        console.error(`Failed to obtain suggestedUserChatId for user ${message.suggestedUser._id.toString()}`);
        return res.status(500).json({ message: 'Failed to create chat' });
      }

      const suggestingUser = await UserModel.findById(userId).select('profileImageUrl name category').exec();
      const suggestedUserProfileImageUrl = suggestingUser?.profileImageUrl || '';
      const suggestedUserName = req.user?.name || 'User';
      const suggestedUserCategory = suggestingUser?.category || 'unknown';

      const matchMessageContent = `${message.suggestedUser.name}さん、おはようございます！\n${message.suggestedUser.name}さんに${suggestedUserCategory}カテゴリーの${suggestedUserName}さんからマッチの希望が届いています。\nお繋がりを希望しますか？`;
      const matchBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId],
        recipientId: message.suggestedUser._id.toString(),
        suggestedUser: userId,
        suggestionReason: 'Match request',
        status: 'pending',
        isMatchCard: true,
        isSuggested: false,
        suggestedUserProfileImageUrl,
        suggestedUserName,
        suggestedUserCategory
      };

      const existingMessage = await BotMessageModel.findOne({
        chatId: suggestedUserChatId,
        senderId: dependencies.virtualUserId,
        suggestedUser: userId,
        recipientId: message.suggestedUser._id.toString(),
        status: 'pending'
      });
      if (existingMessage) {
        console.log(`Duplicate match request found for user ${message.suggestedUser._id.toString()} in chat ${suggestedUserChatId}, skipping...`);
        return res.status(200).json({
          message: `${message.suggestedUser.name}さんにマッチの希望を送りました。`
        });
      }

      await botMessageRepo.create(matchBotMessage);
      console.log(`Created match bot message: ${matchBotMessage.id} in chat ${suggestedUserChatId} for user ${message.suggestedUser._id.toString()}`);

      const matchMessage: Message = {
        id: matchBotMessage.id,
        sender: dependencies.virtualUserId,
        senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: matchBotMessage.createdAt!,
        readBy: matchBotMessage.readBy,
        isMatchCard: matchBotMessage.isMatchCard ?? false,
        isSuggested: matchBotMessage.isSuggested ?? false
      };

      console.log(`Emitting match message with ID: ${matchMessage.id}, isMatchCard: ${matchMessage.isMatchCard}, isSuggested: ${matchMessage.isSuggested}, status: ${matchMessage.status}`);
      socketService.emitMessage(suggestedUserChatId, matchMessage);
      console.log(`Emitted match message ${matchBotMessage.id} to chat ${suggestedUserChatId} for user ${message.suggestedUser._id.toString()}`);
      res.status(200).json({
        message: `${message.suggestedUser.name}さんにマッチの希望を送りました。`
      });
    } catch (error) {
      console.error('Error responding to suggestion:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/matches/respond', async (req: Request, res: Response) => {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const message = await BotMessageModel.findById(messageId).populate<{
        suggestedUser: { _id: mongoose.Types.ObjectId; name: string; profileImageUrl?: string; category?: string }
      }>('suggestedUser', 'profileImageUrl name category');
      if (!message || !message.suggestedUser) {
        console.log(`Match request not found for messageId: ${messageId}`);
        return res.status(400).json({ message: 'Match request not found' });
      }

      if (message.status !== 'pending') {
        console.log(`Match request already processed for messageId: ${messageId}, status: ${message.status}`);
        return res.status(400).json({ message: 'Match request already processed' });
      }

      const chatId = message.chatId?.toString();
      if (!chatId) {
        console.error(`ChatId is null for match message ${messageId}`);
        return res.status(500).json({ message: 'Invalid chat ID' });
      }

      console.log(`User ${userId} responded to match request ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

      const userResponseMessage: Message = {
        id: new mongoose.Types.ObjectId().toString(),
        sender: userId,
        content: response,
        chatId,
        createdAt: new Date(),
        readBy: [userId],
        isMatchCard: false,
        isSuggested: false
      };
      await dependencies.messageRepository.create(userResponseMessage);
      socketService.emitMessage(chatId, userResponseMessage);
      console.log(`Created user response message: ${userResponseMessage.id} in chat ${chatId}`);

      if (response === 'マッチを希望しない') {
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser._id.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser._id.toString(), userId);
        console.log(`Added ${message.suggestedUser._id.toString()} to blacklist of ${userId} and vice versa`);

        const rejectMessages = [
          `マッチングを却下しました。${message.suggestedUser.name}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`,
          `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`,
          `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
        ];

        for (const content of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content,
            chatId,
            createdAt: new Date(),
            readBy: [dependencies.virtualUserId],
            isMatchCard: false,
            isSuggested: false,
            status: 'pending'
          };
          await botMessageRepo.create(rejectBotMessage);

          const rejectMessage: Message = {
            id: rejectBotMessage.id,
            sender: dependencies.virtualUserId,
            senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
            content: rejectBotMessage.content || '',
            chatId,
            createdAt: rejectBotMessage.createdAt!,
            readBy: rejectBotMessage.readBy,
            isMatchCard: rejectBotMessage.isMatchCard ?? false,
            isSuggested: rejectBotMessage.isSuggested ?? false
          };
          socketService.emitMessage(chatId, rejectMessage);
          console.log(`Created rejection bot message: ${rejectBotMessage.id} in chat ${chatId}`);
        }

        return res.status(200).json({ message: rejectMessages });
      }

      const confirmBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: `${message.suggestedUser.name}さんとのビジネスマッチが承認されました。チャットで挨拶してみましょう。`,
        chatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending'
      };
      await botMessageRepo.create(confirmBotMessage);
      const confirmMessage: Message = {
        id: confirmBotMessage.id,
        sender: dependencies.virtualUserId,
        senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
        content: confirmBotMessage.content || '',
        chatId,
        createdAt: confirmBotMessage.createdAt!,
        readBy: confirmBotMessage.readBy,
        isMatchCard: confirmBotMessage.isMatchCard ?? false,
        isSuggested: confirmBotMessage.isSuggested ?? false
      };
      socketService.emitMessage(chatId, confirmMessage);
      console.log(`Created confirmation bot message: ${confirmBotMessage.id} in chat ${chatId}`);

      const botId = process.env.BOT_ID;
      if (!botId) {
        throw new Error('BOT_ID is not defined in .env');
      }
      const users = [userId, message.suggestedUser._id.toString(), botId];

      const suggestedUserName = message.suggestedUser.name || 'User';
      const newChat = await dependencies.chatService.createChatUseCase.execute(
        users,
        `Group Chat with ${req.user?.name || 'User'}, ${suggestedUserName}, and Virtual Assistant`,
        true
      );

      const user1 = await UserModel.findById(userId).select('name category').exec();
      const user2 = await UserModel.findById(message.suggestedUser._id).select('name category').exec();
      const groupMessages = [
        `${user1?.name || 'User'}さん、お世話になっております！こちら${user2?.category || 'unknown'}カテゴリーの${user2?.name || 'User'}さんをご紹介します！${user2?.category || 'unknown'}カテゴリーの${user2?.name || 'User'}さんの強みは“自社の強みテーブル”です！`,
        `${user2?.name || 'User'}さん、お世話になっております！こちら${user1?.category || 'unknown'}カテゴリーの${user1?.name || 'User'}さんをご紹介します！${user1?.category || 'unknown'}カテゴリーの${user1?.name || 'User'}さんの強みは”自社の強みテーブル”です！`,
        `是非お二人でお話をしてみてください！`
      ];

      for (const content of groupMessages) {
        const groupBotMessage: BotMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: botId,
          content,
          chatId: newChat.id,
          createdAt: new Date(),
          readBy: [botId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending'
        };
        await botMessageRepo.create(groupBotMessage);

        const groupMessage: Message = {
          id: groupBotMessage.id,
          sender: botId,
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          content: groupBotMessage.content || '',
          chatId: newChat.id,
          createdAt: groupBotMessage.createdAt!,
          readBy: groupBotMessage.readBy,
          isMatchCard: groupBotMessage.isMatchCard ?? false,
          isSuggested: groupBotMessage.isSuggested ?? false
        };
        socketService.emitMessage(newChat.id, groupMessage);
        console.log(`Created group bot message: ${groupBotMessage.id} in chat ${newChat.id}`);
      }

      let notifyChatId: string | null = await chatRepo.getPrivateChatId(message.suggestedUser._id.toString(), dependencies.virtualUserId);
      if (!notifyChatId) {
        console.log(`Creating new chat for user ${message.suggestedUser._id.toString()} with virtual user ${dependencies.virtualUserId}`);
        const newChat = await dependencies.chatService.createChatUseCase.execute(
          [message.suggestedUser._id.toString(), dependencies.virtualUserId],
          `Private Chat with Virtual Assistant`,
          false
        );
        notifyChatId = newChat.id;
        console.log(`Created new chat: ${notifyChatId}`);
      }

      if (!notifyChatId) {
        console.error(`Failed to obtain notifyChatId for user ${message.suggestedUser._id.toString()}`);
        return res.status(500).json({ message: 'Failed to create notification chat' });
      }

      const notificationMessageContent = `${req.user?.name || 'User'}さんとのビジネスマッチが承認されました。チャットで挨拶してみましょう。`;
      const notifyBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: notificationMessageContent,
        chatId: notifyChatId,
        createdAt: new Date(),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending'
      };

      await botMessageRepo.create(notifyBotMessage);
      console.log(`Created notification message: ${notifyBotMessage.id} in chat ${notifyChatId}`);

      const notifyMessage: Message = {
        id: notifyBotMessage.id,
        sender: dependencies.virtualUserId,
        senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
        content: notificationMessageContent,
        chatId: notifyChatId,
        createdAt: notifyBotMessage.createdAt!,
        readBy: notifyBotMessage.readBy,
        isMatchCard: notifyBotMessage.isMatchCard ?? false,
        isSuggested: notifyBotMessage.isSuggested ?? false
      };

      socketService.emitMessage(notifyChatId, notifyMessage);
      console.log(`Emitted notification to ${message.suggestedUser._id.toString()} for new chat ${newChat.id}`);

      res.status(200).json({
        message: `${message.suggestedUser.name}さんとのビジネスマッチが承認されました。チャットで挨拶してみましょう。`,
        chatId: newChat.id
      });
    } catch (error) {
      console.error('Error responding to match:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

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