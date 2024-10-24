// src/infra/gateways/StripeGateway.ts

import Stripe from "stripe";
import { IStripeGateway } from "../../domain/services/IStripeGateway";
import { CONFIG } from "../../main/config/config";

export class StripeGateway implements IStripeGateway {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({ email, name });
    return customer.id;
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
  ): Promise<{ id: string }> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${CONFIG.FRONT_URL}/account-creation-completed`,
      cancel_url: `${CONFIG.FRONT_URL}/stripe-payment`,
      automatic_tax: { enabled: true },
      customer_update: {
        address: "auto",
      },
      customer: customerId,
      locale: "ja",
    });
    return { id: session.id };
  }
}
