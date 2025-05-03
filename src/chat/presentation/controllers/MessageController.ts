import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { BotMessageModel } from '/Users/lubna/Desktop/comy_back_new/comy_api/src/chat/infra/database/models/models/BotMessageModel';

export class MessageController {
  private sendMessageUseCase: any;
  private getMessagesUseCase: any;

  constructor(sendMessageUseCase: any, getMessagesUseCase: any) {
    this.sendMessageUseCase = sendMessageUseCase;
    this.getMessagesUseCase = getMessagesUseCase;
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const chatId = req.params.chatId;
    try {
      console.log(`Fetching messages for chatId: ${chatId}`);
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        console.log(`Invalid chat ID: ${chatId}`);
        res.status(400).json({ message: 'Invalid chat ID' });
        return;
      }
      const messages = await this.getMessagesUseCase.execute(chatId);
      console.log(`Found ${messages.length} messages for chatId: ${chatId}`);
      res.status(200).json(messages);
    } catch (error: any) {
      console.error(`Error fetching messages for chatId: ${chatId}`, error);
      res.status(500).json({ message: 'Server error', error: error.message || error });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageData = req.body;
      const userId = (req as any).user?.id;
      const message = await this.sendMessageUseCase.execute({ ...messageData, senderId: userId });
      res.status(200).json(message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error', error: error.message || error });
    }
  }
}