import { Request, Response } from 'express';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../application/use-cases/GetUserChatsUseCase';
import { Chat } from '../../domain/entities/Chat';

export class ChatController {
  constructor(
    private createChatUseCase: CreateChatUseCase,
    private getUserChatsUseCase: GetUserChatsUseCase
  ) {}

  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { name, isGroupChat, users } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const chat = await this.createChatUseCase.execute(
        [...users, userId],
        name,
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

      const chats = await this.getUserChatsUseCase.execute(userId);
      res.status(200).json(chats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}