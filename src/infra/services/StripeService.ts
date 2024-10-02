import Stripe from "stripe";
import { CONFIG } from "../../main/config/config";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const endpointSecret = CONFIG.STRIPE_WEBHOOK_SECRET;
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret,
    );
  }
}
