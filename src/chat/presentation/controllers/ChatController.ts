import { Request, Response } from 'express';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../application/use-cases/GetUserChatsUseCase';
import { CreateChatWithBotUseCase } from '../../application/use-cases/CreateChatWithBotUseCase';
import { CONFIG } from '../../../main/config/config';

export class ChatController {
  private adminId: string = CONFIG.ADMIN;

  constructor(
    private createChatUseCase: CreateChatUseCase,
    private getUserChatsUseCase: GetUserChatsUseCase,
    private createChatWithBotUseCase: CreateChatWithBotUseCase
  ) { }

  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { name, isGroupChat, users } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updatedUsers = isGroupChat ? [...new Set([...users, userId, this.adminId])] : [...new Set([...users, userId])];

      const chat = await this.createChatUseCase.execute(
        updatedUsers,
        name ,
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

      await this.createChatWithBotUseCase.execute(userId)

      const chats = await this.getUserChatsUseCase.execute(userId);
      const response = {
        isAdmin: userId === this.adminId, // Set isAdmin at the top level
        chats: chats, // Include all chats with their full details
      };

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}