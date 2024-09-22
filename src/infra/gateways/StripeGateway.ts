// src/infra/gateways/StripeGateway.ts

import Stripe from "stripe";
import { IStripeGateway } from "../../domain/services/IStripeGateway";
import { CONFIG } from "../../main/config/config";

export class StripeGateway implements IStripeGateway {
    private stripe: Stripe;

    constructor() {
        this.stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20',
        });
    }

    async createCustomer(email: string, name: string): Promise<string> {
        const customer = await this.stripe.customers.create({ email, name });
        return customer.id;
      }

      async createCheckoutSession(customerId: string): Promise<{ id: string }> {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: 'One Year Subscription',
                },
                unit_amount: 13200,
                recurring: {
                  interval: 'year',
                },
              },
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${CONFIG.ORIGIN_URL}/account-creation-completed`,
          cancel_url: `${CONFIG.ORIGIN_URL}/stripe-payment`,
          customer: customerId,
        });
        return { id: session.id };
      }
}