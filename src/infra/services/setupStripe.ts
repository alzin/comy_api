import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { CONFIG } from '../../main/config/config';

export function setupStripe(app: express.Application) {
  const stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  app.post('/create-checkout-session', async (req: Request, res: Response) => {
    try {
      const session = await stripe.checkout.sessions.create({
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
        success_url: 'https://comy-front-end.vercel.app/account-creation-completed',
        cancel_url: 'https://comy-front-end.vercel.app/stripe-payment',
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}