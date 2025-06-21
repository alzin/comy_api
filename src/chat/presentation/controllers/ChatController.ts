import { Request, Response } from 'express';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../application/use-cases/GetUserChatsUseCase';
import { MongoChatRepository } from '../../infra/repo/MongoChatRepository';
import { CONFIG } from '../../../main/config/config';

export class ChatController {
  private createChatUseCase: CreateChatUseCase;
  private getUserChatsUseCase: GetUserChatsUseCase;
  private chatRepository: MongoChatRepository;
  private virtualUserId: string = CONFIG.BOT_ID;
  private adminId: string = CONFIG.ADMIN;

  constructor(
    createChatUseCase: CreateChatUseCase,
    getUserChatsUseCase: GetUserChatsUseCase
  ) {
    this.createChatUseCase = createChatUseCase;
    this.getUserChatsUseCase = getUserChatsUseCase;
    this.chatRepository = new MongoChatRepository();
  }

  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { name, isGroupChat, users } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const botId = CONFIG.ADMIN;
      const updatedUsers = isGroupChat ? [...new Set([...users, userId, botId])] : [...new Set([...users, userId])];

      const chat = await this.createChatUseCase.execute(
        updatedUsers,
        name || (isGroupChat ? 'Group Chat with Virtual Assistant' : 'Private Chat'),
        isGroupChat
      );
      res.status(201).json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let botChatId = await this.chatRepository.getPrivateChatId(userId, this.virtualUserId);
      if (!botChatId && userId !== this.adminId) {
        console.log(`Create a new conversation for the user ${userId} with bot ${this.virtualUserId}`);
        const newChat = await this.createChatUseCase.execute(
          [userId, this.virtualUserId],
          'Private Chat with Virtual Assistant',
          false
        );
        botChatId = newChat.id;
        console.log(`A new conversation has been created: ${botChatId}`);
      } else if (botChatId) {
        console.log(`Found an existing conversation for the user ${userId}: ${botChatId}`);
      }

      const chats = await this.getUserChatsUseCase.execute(userId);
      const response = {
        isAdmin: userId === this.adminId, // Set isAdmin at the top level
        chats: chats, // Include all chats with their full details
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('error', error);
      res.status(500).json({ error: error.message });
    }
  }
}