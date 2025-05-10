import { Request, Response } from 'express';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../application/use-cases/GetUserChatsUseCase';
import { Chat } from '../../domain/entities/Chat';
import { MongoBotMessageRepository } from '../../infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../infra/repo/MongoBlacklistRepository';

export class ChatController {
  constructor(
    private createChatUseCase: CreateChatUseCase,
    private getUserChatsUseCase: GetUserChatsUseCase,
    private botMessageRepository: MongoBotMessageRepository,
    private blacklistRepository: MongoBlacklistRepository
  ) {}

  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { name, isGroupChat, users } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Ensure the bot is included in the users list for group chats
      const botId = '681c757539ec003942b3f97e'; // معرف البوت الجديد
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

      const chats = await this.getUserChatsUseCase.execute(userId);
      res.status(200).json(chats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}