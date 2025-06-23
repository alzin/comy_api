
import { Request, Response } from 'express';
import { RespondToSuggestionUseCase } from '../../application/use-cases/RespondToSuggestionUseCase';
import { RespondToMatchUseCase } from '../../application/use-cases/RespondToMatchUseCase';

export class RespondTregarController {
  private respondToSuggestionUseCase: RespondToSuggestionUseCase;
  private respondToMatchUseCase: RespondToMatchUseCase;

  constructor(
    respondToSuggestionUseCase: RespondToSuggestionUseCase,
    respondToMatchUseCase: RespondToMatchUseCase
  ) {
    this.respondToSuggestionUseCase = respondToSuggestionUseCase;
    this.respondToMatchUseCase = respondToMatchUseCase;
  }

  async ToSuggestion(req: Request, res: Response): Promise<void> {

    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const result = await this.respondToSuggestionUseCase.execute({ messageId, response, userId });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error responding to suggestion:', error);
      res.status(400).json({ error: 'Failed to respond to suggestion' });
    }


  }

  async ToMatch(req: Request, res: Response): Promise<void> {
    const { messageId, response } = req.body;
    const userId = req.user?.id;

    if (!userId || !messageId || !['マッチを希望する', 'マッチを希望しない'].includes(response)) {
      res.status(400).json({ message: 'Invalid request' });
    }

    try {
      const result = await this.respondToMatchUseCase.execute({ messageId, response, userId });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error responding to match:', error);
      res.status(400).json({ error: 'Failed to respond to match' });
    }
  }
}