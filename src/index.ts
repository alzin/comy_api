import { CONFIG } from "./main/config/config";

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import { authMiddleware } from "./presentation/middlewares/authMiddleware";
import { log } from "console";

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

const app = express();

const corsOptions = {
  origin: CONFIG.ORIGIN_URL,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
setupSwagger(app);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.use(authMiddleware(tokenService, userRepository));
app.use("/auth", setupAuthRoutes(authController));

app.get("/check-auth", (req, res) => {
  res.json({ isAuthenticated: !!req.user });
});

const stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
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
    log(e);
    res.status(500).json({ error: e });
  }
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(CONFIG.PORT, () => {
      log(`Server is running on http://localhost:${CONFIG.PORT}`);
    });
  } catch (error) {
    log("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
