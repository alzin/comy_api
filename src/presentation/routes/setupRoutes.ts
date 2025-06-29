// src/presentation/routes/setupRoutes.ts

import express from "express";
import { setupBusinessSheetRoutes } from "./BusinessSheetRoutes";
import { authMiddleware } from "../middlewares/authMiddleware";
import { setupAuthRoutes } from "./authRoutes";
import { setupStripeRoutes } from "./StripeRoutes";
import { setupUserInfoRoutes } from "./userRoutes";
import { createActiveUsersEmailRoutes } from "./activeUsersEmailRoutes";
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } from '@copilotkit/runtime';
import { setupChatRoutes } from '../../chat/presentation/routes/chatRoutes';

const serviceAdapter = new OpenAIAdapter({
  model: "gpt-4o-mini",
});

export function setupRoutes(app: express.Application, dependencies: any) {
  app.get("/", (_, res) => res.status(200).send("OK"));

  app.use(
    authMiddleware(dependencies.tokenService, dependencies.userRepository),
  );
  app.use(
    "/create-checkout-session",
    setupStripeRoutes(dependencies.stripeController),
  );

  app.use(
    "/business-sheets",
    setupBusinessSheetRoutes(dependencies.businessSheetController),
  );

  app.use("/auth", setupAuthRoutes(dependencies.authController));
  app.use('/api/chats', setupChatRoutes(
    dependencies.chatController,
    dependencies.messageController,
    dependencies.respondTregarController,
    dependencies.suggestFriendController
  ));

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

  app.post("/webhook", express.raw({ type: "application/json" }), (req, res) =>
    dependencies.webhookController.handleWebhook(req, res),
  );

  // Set up the CopilotKit endpoint

  app.use('/copilotkit', async (req, res) => {
    try {
      const runtime = new CopilotRuntime();
  
      const handler = copilotRuntimeNodeHttpEndpoint({
        endpoint: '/copilotkit',
        runtime,
        serviceAdapter,
      });
      await handler(req, res);
    } catch (err) {
      console.error("CopilotKit error:", err);
    }
  });
  
  // Add active users email routes
  app.use(
    "/admin/emails", 
    createActiveUsersEmailRoutes(
      dependencies.activeUsersEmailController 
    )
  );
  
}

