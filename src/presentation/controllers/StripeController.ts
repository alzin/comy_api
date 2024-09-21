import { Request, Response } from "express";
import { CreateCheckoutSessionUseCase } from "../../application/use-cases/payment/CreateCheckoutSessionUseCase";

export class StripeController {
    constructor(private createCheckoutSessionUseCase: CreateCheckoutSessionUseCase) {}

    async createCheckoutSession(req: Request, res: Response): Promise<void> {
        try {
          if (!req.user) {
            console.log("Unauthorized: User not authenticated");
            return;
          }
    
          const userId = req.user.id;
          const { sessionId } = await this.createCheckoutSessionUseCase.execute(userId);
          res.json({ id: sessionId });
        } catch (error) {
          console.error('Error creating checkout session:', error);
          if (error instanceof Error) {
            res.status(500).json({ error: error.message });
          } else {
            res.status(500).json({ error: 'An unexpected error occurred' });
          }
        }
      }
}