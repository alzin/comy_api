import { Request, Response } from "express";
import { CreateBasicPlanCheckoutSessionUseCase } from "../../application/use-cases/payment/CreateBasicPlanCheckoutSessionUseCase";
import { CONFIG } from "../../main/config/config";

export class StripeController {
  constructor(
    private createBasicPlanCheckoutSessionUseCase: CreateBasicPlanCheckoutSessionUseCase,
  ) {}

  async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        console.log("Unauthorized: User not authenticated");
        return;
      }

      const userId = req.user.id;
      const { sessionId } =
        await this.createBasicPlanCheckoutSessionUseCase.execute(
          userId,
          CONFIG.BASIC_PLAN_PRICE_ID,
        );
      res.json({ id: sessionId });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unexpected error occurred" });
      }
    }
  }
}
