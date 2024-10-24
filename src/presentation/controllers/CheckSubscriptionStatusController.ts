// src/presentation/controllers/CheckSubscriptionStatusController.ts

import { Request, Response } from "express";
import { CheckSubscriptionStatusUseCase } from "../../application/use-cases/users/CheckSubscriptionStatusUseCase";

export class CheckSubscriptionStatusController {
  constructor(
    private checkSubscriptionStatusUseCase: CheckSubscriptionStatusUseCase,
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const isActive = await this.checkSubscriptionStatusUseCase.execute(
        req.user.id,
      );
      res.json({ isActive });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
