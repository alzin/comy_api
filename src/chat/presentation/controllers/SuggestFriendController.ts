import { Request, Response } from 'express';
import { SendSuggestedFriendUseCase } from '../../application/use-cases/SendSuggestedFriendUseCase';
import { CONFIG } from '../../../main/config/config';

export class SuggestFriendController {
  private sendSuggestedFriendUseCase: SendSuggestedFriendUseCase;

  constructor(sendSuggestedFriendUseCase: SendSuggestedFriendUseCase) {
    this.sendSuggestedFriendUseCase = sendSuggestedFriendUseCase;
  }

  async send(req: Request, res: Response): Promise<void> {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await this.sendSuggestedFriendUseCase.execute();
      res.status(200).json({ message: result.message });
    } catch (error) {
      console.error('Error sending suggested friends:', error.stack);
      res.status(400).json({ error: 'Failed to send suggestion messages', details: error.message });
    }
  }
}