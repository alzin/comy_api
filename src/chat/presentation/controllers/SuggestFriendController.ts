import { Request, Response } from 'express';
import { SendSuggestedFriendUseCase } from '../../application/use-cases/SendSuggestedFriendUseCase';
import { SuggestFriendsUseCase } from '../../application/use-cases/SuggestFriendsUseCase';
import { CONFIG } from '../../../main/config/config';

export class SuggestFriendController {
  private suggestFriendsUseCase: SuggestFriendsUseCase;
  private sendSuggestedFriendUseCase: SendSuggestedFriendUseCase;

  constructor(
    suggestFriendsUseCase: SuggestFriendsUseCase,
    sendSuggestedFriendUseCase: SendSuggestedFriendUseCase,
  ) {
    this.suggestFriendsUseCase = suggestFriendsUseCase;
    this.sendSuggestedFriendUseCase = sendSuggestedFriendUseCase;
  }

  async store(req: Request, res: Response): Promise<void> {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
      res.status(401).json({ error: 'Invalid or missing API key' });
    }
    try {
      await this.suggestFriendsUseCase.execute();
      res.status(200).json({ message: 'Friend suggestions stored successfully' });
    } catch (error) {
      console.error('Error triggering friend suggestions:', error);
      res.status(400).json({ error: 'Failed to trigger friend suggestions' });
    }
  }

  async send(req: Request, res: Response): Promise<void> {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await this.sendSuggestedFriendUseCase.execute();
      res.status(200).json({ message: result.message });
    } catch (error) {
      console.error('Error sending suggested friends:', error);
      res.status(400).json({ error: 'Failed to send suggestion messages' });
    }
  }
}