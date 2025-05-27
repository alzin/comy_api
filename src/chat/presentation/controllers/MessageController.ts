import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SocketIOService } from '../../infra/services/SocketIOService';
import { UserModel } from '../../../infra/database/models/UserModel';

// Utility function to get sender profile image URL
const getSenderProfileImageUrl = async (senderId: string): Promise<string> => {
  if (senderId === 'COMY オフィシャル AI') {
    return 'https://comy-test.s3.ap-northeast-1.amazonaws.com/bot-avatar.png';
  }
  const user = await UserModel.findById(senderId).select('profileImageUrl').exec();
  return user?.profileImageUrl || 'https://comy-test.s3.ap-northeast-1.amazonaws.com/default-avatar.png';
};


export class MessageController {
  private sendMessageUseCase: any;
  private getMessagesUseCase: any;
  private socketService: SocketIOService;

  constructor(sendMessageUseCase: any, getMessagesUseCase: any, socketService: SocketIOService) {
    this.sendMessageUseCase = sendMessageUseCase;
    this.getMessagesUseCase = getMessagesUseCase;
    this.socketService = socketService;
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const chatId = req.params.chatId;
    const userId = (req as any).user?.id;

    try {
      console.log(`Fetching messages for chatId: ${chatId}`);
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        console.log(`Invalid chat ID: ${chatId}`);
        res.status(400).json({ message: 'Invalid chat ID' });
        return;
      }

      if (!userId) {
        console.log('Unauthorized access: No user ID provided');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Update readBy for all messages in the chat
      await this.getMessagesUseCase.messageRepository.updateReadByForChat(chatId, userId);

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

      if (!userId) {
        console.log('Unauthorized access: No user ID provided');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const sender = await UserModel.findById(userId).select('name').exec();
      const senderName = sender ? sender.name : 'Unknown User';
      const senderProfileImageUrl = await getSenderProfileImageUrl(userId);
      const messageWithSenderImage = {
        ...messageData,
        senderId: userId,
        senderName,
        senderProfileImageUrl,
        readBy: [userId], // Initialize readBy with the sender
      };
      const message = await this.sendMessageUseCase.execute(messageWithSenderImage);
      this.socketService.emitMessage(messageData.chatId, message);
      res.status(200).json(message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error', error: error.message || error });
    }
  }
}