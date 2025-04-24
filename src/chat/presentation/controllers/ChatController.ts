import { Request, Response } from 'express';
import { CreateChatUseCase } from '../../application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../application/use-cases/GetUserChatsUseCase';

export class ChatController {
  private createChatUseCase: CreateChatUseCase;
  private getUserChatsUseCase: GetUserChatsUseCase;

  constructor(createChatUseCase: CreateChatUseCase, getUserChatsUseCase: GetUserChatsUseCase) {
    this.createChatUseCase = createChatUseCase;
    this.getUserChatsUseCase = getUserChatsUseCase;
  }

  async createChat(req: Request, res: Response) {
    try {
      const { name, isGroupChat, users } = req.body;
      const userId = (req as any).user.id;
      const chat = await this.createChatUseCase.execute(name, isGroupChat, users, userId);
      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  }

  async getUserChats(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const chats = await this.getUserChatsUseCase.execute(userId);
      res.status(200).json(chats);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  }
}