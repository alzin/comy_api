import dotenv from "dotenv";
dotenv.config();
import env from "./main/config/env";

import express, { Request, Response } from "express";
import cors from "cors";
import Stripe from "stripe";

import { NodemailerEmailService } from "./infra/services/NodemailerEmailService";
import { BcryptPasswordHasher } from "./infra/services/BcryptPasswordHasher";
import { JwtTokenService } from "./infra/services/JwtTokenService";
import { CryptoRandomStringGenerator } from "./infra/services/CryptoRandomStringGenerator";
import { AuthController } from "./presentation/controllers/AuthController";
import { AuthUseCase } from "./application/use-cases/AuthUseCase";
import { setupAuthRoutes } from "./presentation/routes/authRoutes";
import { connectToDatabase } from "./infra/database/connection";
import { MongoUserRepository } from "./infra/repositories/MongoUserRepository";
import { setupSwagger } from "./main/config/swagger";

const app = express();
app.use(cors());
app.use(express.json());
setupSwagger(app);

const userRepository = new MongoUserRepository();
const emailService = new NodemailerEmailService();
const encryptionService = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const randomStringGenerator = new CryptoRandomStringGenerator();

const authUseCase = new AuthUseCase(
  userRepository,
  emailService,
  encryptionService,
  tokenService,
  randomStringGenerator,
);
const authController = new AuthController(authUseCase);

app.use("/auth", setupAuthRoutes(authController));

const stripe = new Stripe(env.stripeKey, {
  apiVersion: "2024-06-20",
});

app.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "One Year Subscription",
            },
            unit_amount: 12000,
            recurring: {
              interval: "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: "https://yourdomain.com/success",
      cancel_url: "https://yourdomain.com/cancel",
    });

    res.json({ id: session.id });
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

app.get("/", (_, res) => {
  res.status(200).send("OK");
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(env.port, () => {
      console.log(`Server is running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.log("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
