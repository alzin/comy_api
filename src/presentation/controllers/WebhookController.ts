import { Request, Response } from "express";
import { UpdateSubscriptionStatusUseCase } from "../../application/use-cases/payment/UpdateSubscriptionStatusUseCase";
import { StripeService } from "../../infra/services/StripeService";

export class WebhookController {
  constructor(
    private stripeService: StripeService,
    private updateSubscriptionStatusUseCase: UpdateSubscriptionStatusUseCase,
  ) {}

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers["stripe-signature"] as string;

    try {
      const event = this.stripeService.verifyWebhookSignature(req.body, sig);

      switch (event.type) {
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object;
          await this.updateSubscriptionStatusUseCase.execute(subscription);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.status(400).send(`Webhook Error: ${error}`);
    }
  }
}
