import { Request, Response } from 'express';
import { SendMessageUseCase } from '../../application/use-cases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../application/use-cases/GetMessagesUseCase';

export class MessageController {

  constructor(
    private sendMessageUseCase: SendMessageUseCase,
    private getMessagesUseCase: GetMessagesUseCase,
  ) { }

  async getMessages(req: Request, res: Response): Promise<void> {
    const chatId = req.params.chatId;
    const userId = (req as any).user?.id;

    try {

      if (!userId) {
        console.log('Unauthorized access: No user ID provided');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const messages = await this.getMessagesUseCase.execute(userId, chatId);
      res.status(200).json(messages);

    } catch (error: any) {
      console.error(`Error fetching messages for chatId: ${chatId}`, error);
      res.status(500).json({ message: 'Server error', error: error.message || error });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, content } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!chatId || !content || content.trim() === '') {
        res.status(400).json({ message: 'Missing required fields: chatId or content' });
        return;
      }

      const messageDetails = {
        senderId: userId,
        content,
        chatId,
      };

      const message = await this.sendMessageUseCase.execute(messageDetails);

      res.status(200).json(message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error', error: error.message || error });
    }
  }
}