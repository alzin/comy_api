import { Request, Response } from 'express';
import { SendMessageUseCase } from '../../application/use-cases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../application/use-cases/GetMessagesUseCase';

export class MessageController {
  private sendMessageUseCase: SendMessageUseCase;
  private getMessagesUseCase: GetMessagesUseCase;

  constructor(sendMessageUseCase: SendMessageUseCase, getMessagesUseCase: GetMessagesUseCase) {
    this.sendMessageUseCase = sendMessageUseCase;
    this.getMessagesUseCase = getMessagesUseCase;
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const { chatId, content } = req.body;
      const userId = (req as any).user.id;
      const message = await this.sendMessageUseCase.execute(chatId, content, userId);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const messages = await this.getMessagesUseCase.execute(chatId, page, limit);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  }
}