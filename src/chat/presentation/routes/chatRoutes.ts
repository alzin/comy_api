import express, { Request, Response } from 'express';
import { ChatController } from '../controllers/ChatController';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../../../presentation/middlewares/authMiddleware';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { MongoFriendRepository } from '../../infra/repo/MongoFriendRepository';
import { MongoSuggestedPairRepository } from '../../infra/repo/MongoSuggestedPairRepository';
import { ISocketService } from '../../domain/services/ISocketService';
import { BotMessage } from '../../domain/repo/IBotMessageRepository';
import { Message } from '../../../chat/domain/entities/Message';
import mongoose from 'mongoose';
import BotMessageModel from '../../infra/database/models/BotMessageModel';
import MessageModel from '../../../chat/infra/database/models/MessageModel';
import { UserModel } from '../../../infra/database/models/UserModel';
import { SuggestFriendsUseCase } from '../../application/use-cases/SuggestFriendsUseCase';
import SuggestedPairModel from '../../infra/database/models/SuggestedPairModel';
import { CONFIG } from '../../../main/config/config';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getSenderProfileImageUrl = async (sender: string, dependencies: any, userId?: string): Promise<string> => {
  if (sender === 'COMY オフィシャル AI') {
    return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot_image.jpg';
  }
  const user = await UserModel.findById(sender).select('profileImageUrl').exec();
  return user?.profileImageUrl ;
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

const getImageUrlForBusinessSheet = async (): Promise<string> => {
  return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/business-sheet-update.png';
};
const generateZoomLinkForBusinessSheet = async (): Promise<string> => {
  return 'https://zoom.us/j/business-sheet-meeting';
};
const getImageUrlForVirtualMeeting = async (): Promise<string> => {
  return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/virtual-meeting.png';
};
const generateZoomLinkForVirtualMeeting = async (): Promise<string> => {
  return 'https://zoom.us/j/virtual-meeting';
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

  const router = express.Router();

  router.use((req: Request, res: Response, next: express.NextFunction) => {
    console.log('Request path:', req.path);
    if (req.path === '/suggest-friends' || req.path === '/send-suggested-friend') {
      console.log('Skipping authMiddleware for:', req.path);
      return next();
    }
    console.log('Applying authMiddleware for:', req.path);
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

        const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
        const rejectMessages = [
          {
            content: `マッチングを却下しました。${req.user?.name || 'User'}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`
          },
          {
            content: `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`
          },
          {
            content: `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
          }
        ];

        for (const msg of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content: msg.content,
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

        // Single image message with both images
        const imageBotMessage: BotMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: dependencies.virtualUserId,
          content: '',
          chatId,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: [dependencies.virtualUserId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: botProfileImageUrl,
          images: [
            {
              imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
              zoomLink: 'https://zoom.us/j/business-sheet-meeting'
            },
            {
              imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
              zoomLink: 'https://zoom.us/j/virtual-meeting'
            }
          ]
        };
        await botMessageRepo.create(imageBotMessage);
        await delay(500);

        const imageMessage: Message = {
          id: imageBotMessage.id,
          senderId: 'COMY オフィシャル AI',
          senderName: 'COMY オフィシャル AI',
          content: imageBotMessage.content || '',
          chatId,
          createdAt: imageBotMessage.createdAt!,
          readBy: imageBotMessage.readBy,
          isMatchCard: imageBotMessage.isMatchCard ?? false,
          isSuggested: imageBotMessage.isSuggested ?? false,
          senderProfileImageUrl: botProfileImageUrl,
          images: imageBotMessage.images
        };
        socketService.emitMessage(chatId, imageMessage);
        console.log(`Created image bot message: ${imageBotMessage.id} in chat ${chatId} with images: ${JSON.stringify(imageBotMessage.images)}`);

        return res.status(200).json({ message: rejectMessages.map(msg => msg.content) });
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

        const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
        const rejectMessages = [
          {
            content: `マッチングを却下しました。${req.user?.name || 'User'}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。`
          },
          {
            content: `お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。`
          },
          {
            content: `月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。`
          }
        ];

        for (const msg of rejectMessages) {
          const rejectBotMessage: BotMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            senderId: dependencies.virtualUserId,
            content: msg.content,
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

        // Single image message with both images
        const imageBotMessage: BotMessage = {
          id: new mongoose.Types.ObjectId().toString(),
          senderId: dependencies.virtualUserId,
          content: '',
          chatId,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: [dependencies.virtualUserId],
          isMatchCard: false,
          isSuggested: false,
          status: 'pending',
          senderProfileImageUrl: botProfileImageUrl,
          images: [
            {
              imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
              zoomLink: 'https://zoom.us/j/business-sheet-meeting'
            },
            {
              imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
              zoomLink: 'https://zoom.us/j/virtual-meeting'
            }
          ]
        };
        await botMessageRepo.create(imageBotMessage);
        await delay(500);

        const imageMessage: Message = {
          id: imageBotMessage.id,
          senderId: 'COMY オフィシャル AI',
          senderName: 'COMY オフィシャル AI',
          content: imageBotMessage.content || '',
          chatId,
          createdAt: imageBotMessage.createdAt!,
          readBy: imageBotMessage.readBy,
          isMatchCard: imageBotMessage.isMatchCard ?? false,
          isSuggested: imageBotMessage.isSuggested ?? false,
          senderProfileImageUrl: botProfileImageUrl,
          images: imageBotMessage.images
        };
        socketService.emitMessage(chatId, imageMessage);
        console.log(`Created image bot message: ${imageBotMessage.id} in chat ${chatId} with images: ${JSON.stringify(imageBotMessage.images)}`);

        return res.status(200).json({ message: rejectMessages.map(msg => msg.content) });
      }

      await friendRepo.addFriend(userId, message.suggestedUser._id.toString());
      console.log(`Added friendship between ${userId} and ${message.suggestedUser._id.toString()}`);

      const botProfileImageUrl = await getSenderProfileImageUrl('COMY オフィシャル AI', dependencies);
      const confirmBotMessage: BotMessage = {
        id: new mongoose.Types.ObjectId().toString(),
        senderId: dependencies.virtualUserId,
        content: `${message.suggestedUser.name}さんとのビジネスマッチができました。チャットで挨拶してみましょう。`,
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

      const botId = CONFIG.ADMIN;
      if (!botId) {
        throw new Error('ADMIN is not defined in .env');
      }

      const user1 = await UserModel.findById(userId).select('name id');
      const user2 = await UserModel.findById(message.suggestedUser._id).select('name id');
      if (!user1 || !user2) {
        console.error(`User ${userId} or suggested user ${message.suggestedUser._id} not found`);
        throw new Error('User or suggested user not found');
      }

      console.log(`Creating group chat for users: ${user1.name}, ${user2.name}`);

      const users = [userId, message.suggestedUser._id.toString(), botId];
      const chatName = `${user1.name}, ${user2.name}`;
      const newChat = await dependencies.chatService.createChatUseCase.execute(
        users,
        chatName,
        true
      );

      const groupMessages = [
        `${user1.name}さん、おはようございます！こちらも${user2.name}さんをご紹介します！`,
        `${user2.name}さん、おはようございます！こちらも${user1.name}さんをご紹介します！`,
        `ぜひお二人でお話をしてみてください！`
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
        await delay(500);

        const groupMessage: Message = {
          id: groupBotMessage.id,
          senderId: 'COMMY オフィシャル AI',
          senderName: 'COMMY オフィシャル AI',
          content: groupBotMessage.content || '',
          chatId: newChat.id,
          createdAt: groupBotMessage.createdAt!,
          readBy: groupBotMessage.readBy,
          isMatchCard: groupBotMessage.isMatchCard,
          isSuggested: groupBotMessage.isSuggested,
          senderProfileImageUrl: botProfileImageUrl
        };
        socketService.emitMessage(newChat.id, groupMessage);
        console.log(`Created group bot message: ${groupBotMessage.id} in chat ${chatId} `);
      }

      let notifyChatId: string | null = await chatRepo.getPrivateChatId(message.suggestedUser._id.toString(), dependencies.virtualUserId);
      if (!notifyChatId) {
        console.log(`Creating new chat for user ${message.suggestedUser._id.toString()} with virtual user ${userId}`);
        const newChat = await dependencies.chatService.createChatUseCase.execute(
          [message.suggestedUser._id.toString(), dependencies.virtualUserId],
          `Private Chat with Virtual Assistant`,
          false
        );
        notifyChatId = newChat.id;
        console.log(`Created chat: ${chatId}`);
      }

      if (!notifyChatId) {
        console.error(`Failed to notifyChatId ${message.suggestedUser.toString()}`);
        return res.status(500).json({ error: 'Failed to create notification chat' });
      }

      const notificationMessageContent = `${req.user.name || 'unknown'}さんとのビジネスマッチができました。チャットで挨拶してみましょう！`;
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
      console.log(`Notification message: ${notifyBotMessage.id} in chat ${chatId}`);

      const notifyMessage: Message = {
        id: notifyBotMessage.id,
        senderId: 'COMMY オフィシャル AI',
        senderName: 'COMMY オフィシャル AI',
        content: notificationMessageContent,
        chatId: notifyChatId,
        createdAt: notifyBotMessage.createdAt!,
        readBy: notifyBotMessage.readBy,
        isMatchCard: notifyBotMessage.isMatchCard,
        isSuggested: notifyBotMessage.isSuggested,
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
    console.log('Reached /suggest-friends');
    try {
      const apiKey = req.header('X-API-Key');
      console.log('API_KEY from .env:', CONFIG.API_KEY);
      console.log('X-API-Key from request:', apiKey);
      if (!apiKey || apiKey !== CONFIG.API_KEY) {
        return res.status(401).json({ error: 'Invalid or missing API Key' });
      }
      await suggestFriendsUseCase.execute();
      return res.status(200).json({ message: 'Friend suggestions stored successfully' });
    } catch (error) {
      console.error('Error triggering friend suggestions:', error);
      return res.status(500).json({ error: 'Failed to trigger friend suggestions' });
    }
  });

  router.post('/send-suggested-friend', async (req: Request, res: Response) => {
    console.log('Reached /send-suggested-friend');
    try {
      const apiKey = req.header('X-API-Key');
      console.log('API_KEY from .env:', CONFIG.API_KEY);
      console.log('X-API-Key from request:', apiKey);
      if (!apiKey) {
        return res.status(401).json({ error: 'Missing API Key' });
      }
      if (apiKey !== CONFIG.API_KEY) {
        return res.status(401).json({ error: 'Invalid API Key' });
      }

      const pendingPairs = await suggestedPairRepo.findPending();
      console.log(`Found ${pendingPairs.length} pending suggestions`);

      let sentCount = 0;
      for (const pair of pendingPairs) {
        let userId, suggestedUserId;
        try {
          userId = pair.userId instanceof mongoose.Types.ObjectId ? pair.userId.toString() : new mongoose.Types.ObjectId(pair.userId);
          suggestedUserId = pair.suggestedUserId instanceof mongoose.Types.ObjectId ? pair.suggestedUserId.toString() : new mongoose.Types.ObjectId(pair.suggestedUserId);
        } catch (error) {
          console.error(`Invalid userId or suggestedUserId in pair: ${JSON.stringify(pair)}`, error);
          await suggestedPairRepo.updateStatus(pair._id.toString(), 'rejected');
          continue;
        }

        console.log(`Processing pair: userId=${userId}, suggestedUserId=${suggestedUserId}`);

        const user = await UserModel.findById(userId).select('name').exec();
        const suggestedUser = await UserModel.findById(suggestedUserId).select('name profileImageUrl category').exec();

        if (!user || !suggestedUser) {
          console.log(`User ${userId} or suggested user ${suggestedUserId} not found, skipping...`);
          await suggestedPairRepo.updateStatus(pair._id.toString(), 'rejected');
          continue;
        }

        const userName = user.name || 'User';
        const suggestedUserName = suggestedUser.name || 'User';
        const suggestedUserCategory = suggestedUser.category || 'unknown';
        const profileImageUrl = suggestedUser.profileImageUrl || '';

        let chat = await chatRepo.findByUsers([userId, dependencies.virtualUserId]);
        if (!chat) {
          console.log(`Creating new private chat for user ${userId} with virtual user`);
          chat = await dependencies.chatService.createChatUseCase.execute(
            [userId, dependencies.virtualUserId],
            'Private Chat with Virtual Assistant',
            false
          );
          console.log(`Created chat with ID: ${chat.id}`);
        }

        if (!chat.id) {
          console.error(`Chat ID is null for user ${userId}`);
          continue;
        }

        const existingMessage = await botMessageRepo.findExistingSuggestion(
          chat.id,
          dependencies.virtualUserId,
          userId,
          suggestedUserId
        );
        if (existingMessage) {
          console.log(`Duplicate suggestion found for user ${userId} suggesting ${suggestedUserId}, skipping...`);
          continue;
        }

        const suggestionContent = `${userName}さん、おはようございます！今週は${userName}さんにおすすめの方で${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！\n${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは「自社の強みテーブル」です。\nお繋がり希望しますか？`;
        const suggestionMessage: any = {
          id: new mongoose.Types.ObjectId().toString(),
          chatId: chat.id,
          senderId: dependencies.virtualUserId,
          recipientId: userId,
          suggestedUser: suggestedUserId,
          suggestionReason: 'suggested',
          status: 'pending',
          content: suggestionContent,
          createdAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          readBy: [dependencies.virtualUserId],
          isMatchCard: true,
          isSuggested: true,
          suggestedUserProfileImageUrl: profileImageUrl,
          suggestedUserName,
          suggestedUserCategory,
          senderProfileImageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png'
        };

        await botMessageRepo.create(suggestionMessage);
        console.log(`Saved suggestion message in chat ${chat.id}, suggestedUser: ${suggestedUserId}`);

        const message: Message = {
          id: suggestionMessage.id,
          senderId: 'COMY オフィシャル AI',
          senderName: 'COMY オフィシャル AI',
          senderDetails: { name: 'COMY オフィシャル AI', email: 'virtual@chat.com' },
          content: suggestionContent,
          chatId: chat.id,
          createdAt: suggestionMessage.createdAt,
          readBy: suggestionMessage.readBy,
          isMatchCard: suggestionMessage.isMatchCard,
          isSuggested: suggestionMessage.isSuggested,
          suggestedUserProfileImageUrl: suggestionMessage.suggestedUserProfileImageUrl,
          suggestedUserName: suggestionMessage.suggestedUserName,
          suggestedUserCategory: suggestionMessage.suggestedUserCategory,
          status: suggestionMessage.status,
          senderProfileImageUrl: suggestionMessage.senderProfileImageUrl,
          relatedUserId: suggestedUserId
        };

        socketService.emitMessage(chat.id, message);
        console.log(`Emitted suggestion message to chat ${chat.id}`);

        await suggestedPairRepo.updateStatus(pair._id.toString(), 'sent');
        sentCount++;
      }

      return res.status(200).json({ message: `Sent ${sentCount} suggestion messages successfully` });
    } catch (error) {
      console.error('Error sending suggested friends:', error);
      return res.status(500).json({ error: 'Failed to send suggestion messages' });
    }
  });

  return router;
};