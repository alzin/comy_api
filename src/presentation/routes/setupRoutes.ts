// src/presentation/routes/setupRoutes.ts
import express, { Request, Response, NextFunction, RequestHandler } from "express";
import { setupBusinessSheetRoutes } from "./BusinessSheetRoutes";
import { authMiddleware } from "../middlewares/authMiddleware";
import { setupAuthRoutes } from "./authRoutes";
import { setupStripeRoutes } from "./StripeRoutes";
import { setupUserInfoRoutes } from "./userRoutes";
import { setupAdminRoutes } from "./adminRoutes";
import { createActiveUsersEmailRoutes } from "../../modules/active-users-email/presentation/activeUsersEmailRoutes";

import { 
  CopilotRuntime, 
  OpenAIAdapter, 
  copilotRuntimeNodeHttpEndpoint 
} from '@copilotkit/runtime';

import { LiteralClient } from '@literalai/client';

// Initialize OpenAI Adapter
const serviceAdapter = new OpenAIAdapter({
  model: "gpt-4o-mini"
});

const literalAiClient = new LiteralClient({
  apiKey: process.env.LITERAL_API_KEY,
});

literalAiClient.instrumentation.openai({ client: serviceAdapter });

const runtime = new CopilotRuntime();
      
// Create the handler for CopilotKit requests
const handler = copilotRuntimeNodeHttpEndpoint({
  endpoint: '/copilotkit',
  runtime,
  serviceAdapter,
});

export function setupRoutes(app: express.Application, dependencies: any) {
  // Create ready-to-use auth middleware
  const readyAuthMiddleware = authMiddleware(dependencies.tokenService, dependencies.userRepository);
  const combinedMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    readyAuthMiddleware(req, res, (err?: any) => {
      if (err) return next(err);
      if ((req as any).user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    });
  };
  app.get("/", (_, res) => res.status(200).send("OK"));

  // Apply auth middleware globally
  app.use(readyAuthMiddleware);

  app.use(
    "/create-checkout-session",
    setupStripeRoutes(dependencies.stripeController),
  );

  // Business sheet routes
  app.use(
    "/business-sheets",
    setupBusinessSheetRoutes(dependencies.businessSheetController),
  );

  app.use("/auth", setupAuthRoutes(dependencies.authController));

  app.get("/check-auth", (req, res) => {
    res.json({ isAuthenticated: !!(req as any).user });
  });

  app.use(
    "/user",
    setupUserInfoRoutes(
      dependencies.getAllUsersInfoController,
      dependencies.updateUserInfoController,
      dependencies.searchUsersController,
      dependencies.checkSubscriptionStatusController,
    ),
  );

  app.use(
    "/admin",
    setupAdminRoutes(),
  );

  app.post("/webhook", express.raw({ type: "application/json" }), (req, res) =>
    dependencies.webhookController.handleWebhook(req, res),
  );

  // Set up the CopilotKit endpoint
  app.use('/copilotkit', (req, res, next) => {
    (async () => {
      return handler(req, res);
    })().catch(next); 
  });
  
  // Add active users email routes
  app.use(
    "/admin/emails",
    createActiveUsersEmailRoutes(
      dependencies.activeUsersEmailController 
    )
  );
  
}