// src/modules/active-users-email/presentation/ActiveUsersEmailController.ts
import { Request, Response } from "express";
import { SendActiveUsersEmailUseCase } from "../application/SendActiveUsersEmailUseCase";

export class ActiveUsersEmailController {
  constructor(private useCase: SendActiveUsersEmailUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { subject, content } = req.body;
    try {
      if (!subject || !content) {
        throw new Error("subject requer");
      }
      const result = await this.useCase.execute(subject, content);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ 
        success: false,
        error: (error as Error).message 
      });
    }
  }
}