import { log } from "console";
import express, { Request, Response } from 'express';
import cors from "cors";
import authRouter from "./routes/auth";
import dotenv from "dotenv";
import path from "path";
import Stripe from "stripe";
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const stripe_secret_key = process.env.STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripe_secret_key, {
  apiVersion: '2024-06-20',
});

app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "swagger-ui.html"));
});

app.use("/auth", authRouter);

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
            unit_amount: 12000,
            recurring: {
              interval: 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://yourdomain.com/success',
      cancel_url: 'https://yourdomain.com/cancel',
    });

    res.json({ id: session.id });
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});
