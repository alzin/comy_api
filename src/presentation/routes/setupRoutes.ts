// src/presentation/routes/setupRoutes.ts

import express from "express";
// import { dbConnectMiddleware } from '../middlewares/dbConnectMiddleware';
import { setupBusinessSheetRoutes } from "./BusinessSheetRoutes";
import { authMiddleware } from "../middlewares/authMiddleware";
import { setupAuthRoutes } from "./authRoutes";
import { setupStripeRoutes } from "./StripeRoutes";
import { setupUserInfoRoutes } from "./userRoutes";
import { setupAdminRoutes } from "./adminRoutes";

import { 
  CopilotRuntime, 
  OpenAIAdapter, 
  copilotRuntimeNodeHttpEndpoint 
} from '@copilotkit/runtime';

import { LiteralClient } from '@literalai/client';

export function setupRoutes(app: express.Application, dependencies: any) {
  // // Apply the dbConnectMiddleware to all routes
  // app.use(dbConnectMiddleware);

  app.get("/", (_, res) => res.status(200).send("OK"));

  app.use(
    authMiddleware(dependencies.tokenService, dependencies.userRepository),
  );

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

  // Initialize OpenAI Adapter
  const serviceAdapter = new OpenAIAdapter();

  const literalAiClient = new LiteralClient({
    apiKey: process.env.LITERAL_API_KEY,
  });

  literalAiClient.instrumentation.openai( { client: serviceAdapter } );

  // Set up the CopilotKit endpoint
  app.use('/copilotkit', (req, res, next) => {
    (async () => {
      const runtime = new CopilotRuntime();
      
      // Create the handler for CopilotKit requests
      const handler = copilotRuntimeNodeHttpEndpoint({
        endpoint: '/copilotkit',
        runtime,
        serviceAdapter,
      });
    
      return handler(req, res);
    })().catch(next); 
  });
}
