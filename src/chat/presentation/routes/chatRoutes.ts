import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { MongoFriendRepository } from '../../infra/repo/MongoFriendRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import mongoose from 'mongoose';
import BotMessageModel from '../../infra/database/models/BotMessageModel';
import MessageModel from '../../../chat/infra/database/models/MessageModel';
import { UserModel } from '../../../infra/database/models/UserModel';
import { SuggestFriendsUseCase } from '../../application/use-cases/SuggestFriendsUseCase';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getSenderProfileImageUrl = async (sender: string, dependencies: any, userId?: string): Promise<string> => {
  if (sender === 'COMY オフィシャル AI') {
    return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png';
  }
  const user = await UserModel.findById(sender).select('profileImageUrl').exec();
  return user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';
};

const updateReadByForChat = async (chatId: string, userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  await BotMessageModel.updateMany(
    { chatId: chatId },
    { $addToSet: { readBy: userObjectId } }
  ).exec();

  await MessageModel.updateMany(
    { chat: chatId },
    { $addToSet: { readBy: userObjectId } }
  ).exec();
};

export const setupChatRoutes = (
  chatController: ChatController,
  messageController: MessageController,
  dependencies: any,
  socketService: ISocketService
) => {
  const botMessageRepo = new MongoBotMessageRepository();
  const blacklistRepo = new MongoBlacklistRepository();
  const chatRepo = new MongoChatRepository();
  const friendRepo = new MongoFriendRepository();

  const suggestFriendsUseCase = new SuggestFriendsUseCase(
    dependencies.userRepository,
    botMessageRepo,
    chatRepo,
    blacklistRepo,
    friendRepo,
    dependencies.chatService.createChatUseCase,
    socketService,
    dependencies.virtualUserId
  );

  const router = express.Router();

  router.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.path === '/suggest-friends') {
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

      await updateReadByForChat(chatId, userId);

      console.log(`User ${userId} responded to suggestion ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

      const user = await UserModel.findById(userId).select('name').exec();
      const senderName = user ? user.name : 'Unknown User';
      const userProfileImageUrl = await getSenderProfileImageUrl(userId, dependencies);
      const userResponseMessage: Message = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: userId,
        senderName,
        content: response,
        chatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [userId],
        isMatchCard: false,
        isSuggested: false,
        senderProfileImageUrl: userProfileImageUrl
      };
      const savedUserResponseMessage = await dependencies.messageRepository.create(userResponseMessage, userId);
      socketService.emitMessage(chatId, savedUserResponseMessage);
      console.log(`Created user response message: ${userResponseMessage.id} in chat ${chatId}`);

      await delay(1000);

      if (response === 'マッチを希望しない') {
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser._id.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser._id.toString(), userId);
        console.log(`Added ${message.suggestedUser._id.toString()} to blacklist of ${userId} and vice versa`);

        const rejectMessages = [
          `マッチングを却下しました。${req.user?.name || 'User'}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`,
          `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`,
          `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
        ];

        const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
        for (const content of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content,
            chatId,
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
            readBy: [dependencies.virtualUserId],
            isMatchCard: false,
            isSuggested: false,
            status: 'pending',
            senderProfileImageUrl: botProfileImageUrl
          };
          await botMessageRepo.create(rejectBotMessage);
          await delay(500);

          const rejectMessage: Message = {
            id: rejectBotMessage.id,
            senderId: 'COMY オフィシャル AI',
            senderName: 'COMY オフィシャル AI',
            content: rejectBotMessage.content || '',
            chatId,
            createdAt: rejectBotMessage.createdAt!,
            readBy: rejectBotMessage.readBy,
            isMatchCard: rejectBotMessage.isMatchCard ?? false,
            isSuggested: rejectBotMessage.isSuggested ?? false,
            senderProfileImageUrl: botProfileImageUrl
          };
          socketService.emitMessage(chatId, rejectMessage);
          console.log(`Created rejection bot message: ${rejectBotMessage.id} in chat ${chatId}`);
        }

        return res.status(200).json({ message: rejectMessages });
      }

      const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
      const confirmBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: `${message.suggestedUser.name}さんにマッチの希望を送りました。`,
        chatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: botProfileImageUrl
      };
      await botMessageRepo.create(confirmBotMessage);

      const confirmMessage: Message = {
        id: confirmBotMessage.id,
        senderId: 'COMY オフィシャル AI',
        senderName: 'COMY オフィシャル AI',
        content: confirmBotMessage.content || '',
        chatId,
        createdAt: confirmBotMessage.createdAt!,
        readBy: confirmBotMessage.readBy,
        isMatchCard: confirmBotMessage.isMatchCard ?? false,
        isSuggested: confirmBotMessage.isSuggested ?? false,
        senderProfileImageUrl: botProfileImageUrl
      };
      socketService.emitMessage(chatId, confirmMessage);
      console.log(`Created confirmation bot message: ${confirmBotMessage.id} in chat ${chatId}`);

      let suggestedUserChatId: string | null = await chatRepo.getPrivateChatId(message.suggestedUser._id.toString(), dependencies.virtualUserId);
      if (!suggestedUserChatId) {
        console.log(`Creating new chat for suggested user ${message.suggestedUser._id.toString()} with virtual user ${dependencies.virtualUserId}`);
        try {
          const newChat = await dependencies.chatService.createChatUseCase.execute(
            [message.suggestedUser._id.toString(), dependencies.virtualUserId],
            `Private Chat with Virtual Assistant`,
            false
          );
          suggestedUserChatId = newChat.id;
          console.log(`Created new chat: ${suggestedUserChatId}`);
        } catch (error) {
          console.error(`Failed to create chat for suggested user ${message.suggestedUser._id.toString()}:`, error);
          return res.status(500).json({ message: 'Failed to create chat for suggested user' });
        }
      }

      if (!suggestedUserChatId) {
        console.error(`Failed to obtain suggestedUserChatId for user ${message.suggestedUser._id.toString()}`);
        return res.status(500).json({ message: 'Failed to create chat' });
      }

      const suggestingUser = await UserModel.findById(userId).select('profileImageUrl name category').exec();
      const suggestedUserProfileImageUrl = suggestingUser?.profileImageUrl ?? '';
      const suggestedUserName = req.user?.name || 'User';
      const suggestedUserCategory = suggestingUser?.category || 'unknown';

      const matchMessageContent = `${message.suggestedUser.name}さん、おはようございます！\n${message.suggestedUser.name}さんに${suggestedUserCategory}カテゴリーの${suggestedUserName}さんからマッチの希望が届いています。\nお繋がりを希望しますか？`;
      const matchBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [dependencies.virtualUserId],
        recipientId: message.suggestedUser._id.toString(),
        suggestedUser: userId,
        suggestionReason: 'Match request',
        status: 'pending',
        isMatchCard: true,
        isSuggested: false,
        suggestedUserProfileImageUrl,
        suggestedUserName,
        suggestedUserCategory,
        senderProfileImageUrl: botProfileImageUrl
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

      const savedMatchMessage = await botMessageRepo.create(matchBotMessage);
      console.log(`Created match bot message: ${matchBotMessage.id} in chat ${suggestedUserChatId} for user ${message.suggestedUser._id.toString()}`);

      const matchMessage: Message = {
        id: matchBotMessage.id,
        senderId: 'COMY オフィシャル AI',
        senderName: 'COMY オフィシャル AI',
        content: matchMessageContent,
        chatId: suggestedUserChatId,
        createdAt: matchBotMessage.createdAt!,
        readBy: matchBotMessage.readBy,
        isMatchCard: matchBotMessage.isMatchCard ?? false,
        isSuggested: matchBotMessage.isSuggested ?? false,
        suggestedUserProfileImageUrl: matchBotMessage.suggestedUserProfileImageUrl,
        suggestedUserName: matchBotMessage.suggestedUserName,
        suggestedUserCategory: matchBotMessage.suggestedUserCategory,
        status: matchBotMessage.status,
        senderProfileImageUrl: botProfileImageUrl,
        relatedUserId: userId 
      };
      console.log(`Emitting match message with relatedUserId: ${matchMessage.relatedUserId}, isSuggested: ${matchMessage.isSuggested}, isMatchCard: ${matchMessage.isMatchCard}`);
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

      await updateReadByForChat(chatId, userId);

      console.log(`User ${userId} responded to match request ${messageId} with ${response}`);
      await botMessageRepo.updateSuggestionStatus(messageId, response === 'マッチを希望する' ? 'accepted' : 'rejected');

      const user = await UserModel.findById(userId).select('name').exec();
      const senderName = user ? user.name : 'Unknown User';
      const userProfileImageUrl = await getSenderProfileImageUrl(userId, dependencies);
      const userResponseMessage: Message = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: userId,
        senderName,
        content: response,
        chatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [userId],
        isMatchCard: false,
        isSuggested: false,
        senderProfileImageUrl: userProfileImageUrl
      };
      const savedUserResponseMessage = await dependencies.messageRepository.create(userResponseMessage, userId);
      socketService.emitMessage(chatId, savedUserResponseMessage);
      console.log(`Created user response message: ${userResponseMessage.id} in chat ${chatId}`);

      await delay(1000);

      if (response === 'マッチを希望しない') {
        await blacklistRepo.addToBlacklist(userId, message.suggestedUser._id.toString());
        await blacklistRepo.addToBlacklist(message.suggestedUser._id.toString(), userId);
        console.log(`Added ${message.suggestedUser._id.toString()} to blacklist of ${userId} and vice versa`);

        const rejectMessages = [
          `マッチングを却下しました。${req.user?.name || 'User'}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`,
          `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`,
          `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
        ];

        const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
        for (const content of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content,
            chatId,
            createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
            readBy: [dependencies.virtualUserId],
            isMatchCard: false,
            isSuggested: false,
            status: 'pending',
            senderProfileImageUrl: botProfileImageUrl
          };
          await botMessageRepo.create(rejectBotMessage);
          await delay(500);

          const rejectMessage: Message = {
            id: rejectBotMessage.id,
            senderId: 'COMY オフィシャル AI',
            senderName: 'COMY オフィシャル AI',
            content: rejectBotMessage.content || '',
            chatId,
            createdAt: rejectBotMessage.createdAt!,
            readBy: rejectBotMessage.readBy,
            isMatchCard: rejectBotMessage.isMatchCard ?? false,
            isSuggested: rejectBotMessage.isSuggested ?? false,
            senderProfileImageUrl: botProfileImageUrl
          };
          socketService.emitMessage(chatId, rejectMessage);
          console.log(`Created rejection bot message: ${rejectBotMessage.id} in chat ${chatId}`);
        }

        return res.status(200).json({ message: rejectMessages });
      }

      await friendRepo.addFriend(userId, message.suggestedUser._id.toString());
      console.log(`Added friendship between ${userId} and ${message.suggestedUser._id.toString()}`);

      const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
      const confirmBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: `${message.suggestedUser.name}さんとのビジネスマッチが承認されました。チャットで挨拶してみましょう。`,
        chatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: botProfileImageUrl
      };
      await botMessageRepo.create(confirmBotMessage);

      const confirmMessage: Message = {
        id: confirmBotMessage.id,
        senderId: 'COMY オフィシャル AI',
        senderName: 'COMY オフィシャル AI',
        content: confirmBotMessage.content || '',
        chatId,
        createdAt: confirmBotMessage.createdAt!,
        readBy: confirmBotMessage.readBy,
        isMatchCard: confirmBotMessage.isMatchCard ?? false,
        isSuggested: confirmBotMessage.isSuggested ?? false,
        senderProfileImageUrl: botProfileImageUrl
      };
      socketService.emitMessage(chatId, confirmMessage);
      console.log(`Created confirmation bot message: ${confirmBotMessage.id} in chat ${chatId}`);

      const botId = process.env.ADMIN;
      if (!botId) {
        throw new Error('ADMIN is not defined in .env');
      }

      const user1 = await UserModel.findById(userId).select('name category').exec();
      const user2 = await UserModel.findById(message.suggestedUser._id).select('name category').exec();
      if (!user1 || !user2) {
        console.error(`User ${userId} or suggested user ${message.suggestedUser._id} not found`);
        throw new Error('User or suggested user not found');
      }

      console.log(`Creating group chat for users: ${user1.name} (category: ${user1.category}), ${user2.name} (category: ${user2.category})`);

      const users = [userId, message.suggestedUser._id.toString(), botId];
      const chatName = `${user1.name}, ${user2.name}`;
      const newChat = await dependencies.chatService.createChatUseCase.execute(
        users,
        chatName,
        true
      );

      const groupMessages = [
        `${user1.name}さん、お世話になっております！こちら${user2.category || 'unknown'}カテゴリーの${user2.name}さんをご紹介します！${user2.category || 'unknown'}カテゴリーの${user2.name}さんの強みは“自社の強みテーブル”です！`,
        `${user2.name}さん、お世話になっております！こちら${user1.category || 'unknown'}カテゴリーの${user1.name}さんをご紹介します！${user1.category || 'unknown'}カテゴリーの${user1.name}さんの強みは”自社の強みテーブル”です！`,
        `是非お二人でお話をしてみてください！`
      ];

      for (const content of groupMessages) {
        const groupBotMessage: BotMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: botId,
          content,
          chatId: newChat.id,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: [botId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: botProfileImageUrl
        };
        await botMessageRepo.create(groupBotMessage);
        await delay(1000);

        const groupMessage: Message = {
          id: groupBotMessage.id,
          senderId: 'COMY オフィシャル AI',
          senderName: 'COMY オフィシャル AI',
          content: groupBotMessage.content || '',
          chatId: newChat.id,
          createdAt: groupBotMessage.createdAt!,
          readBy: groupBotMessage.readBy,
          isMatchCard: groupBotMessage.isMatchCard ?? false,
          isSuggested: groupBotMessage.isSuggested ?? false,
          senderProfileImageUrl: botProfileImageUrl
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

      const notificationMessageContent = `${req.user?.name || 'User'}さんとのビジネスマッチができました。チャットで挨拶してみましょう。`;
      const notifyBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: notificationMessageContent,
        chatId: notifyChatId,
        createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        readBy: [dependencies.virtualUserId],
        isMatchCard: false,
        isSuggested: false,
        status: 'pending',
        senderProfileImageUrl: botProfileImageUrl
      };

      await botMessageRepo.create(notifyBotMessage);
      console.log(`Created notification message: ${notifyBotMessage.id} in chat ${notifyChatId}`);

      const notifyMessage: Message = {
        id: notifyBotMessage.id,
        senderId: 'COMY オフィシャル AI',
        senderName: 'COMY オフィシャル AI',
        content: notificationMessageContent,
        chatId: notifyChatId,
        createdAt: notifyBotMessage.createdAt!,
        readBy: notifyBotMessage.readBy,
        isMatchCard: notifyBotMessage.isMatchCard ?? false,
        isSuggested: notifyBotMessage.isSuggested ?? false,
        senderProfileImageUrl: botProfileImageUrl
      };
      socketService.emitMessage(notifyChatId, notifyMessage);
      console.log(`Emitted notification to ${message.suggestedUser._id.toString()} for new chat ${newChat.id}`);

      res.status(200).json({
        message: `${message.suggestedUser.name}さんとのビジネスマッチができました。チャットで挨拶してみましょう。`,
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

      await suggestFriendsUseCase.execute();
      return res.status(200).json({ message: 'Friend suggestions triggered successfully' });
    } catch (error) {
      console.error('Error triggering friend suggestions:', error);
      return res.status(500).json({ error: 'Failed to trigger friend suggestions' });
    }
  });

  return router;
};