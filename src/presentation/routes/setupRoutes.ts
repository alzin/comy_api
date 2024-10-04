// src/presentation/routes/setupRoutes.ts

import express from "express";
// import { dbConnectMiddleware } from '../middlewares/dbConnectMiddleware';
import { setupBusinessSheetRoutes } from "./BusinessSheetRoutes";
import { authMiddleware } from "../middlewares/authMiddleware";
import { setupAuthRoutes } from "./authRoutes";
import { setupStripeRoutes } from "./StripeRoutes";
import { setupUserInfoRoutes } from "./userRoutes";

export function setupRoutes(app: express.Application, dependencies: any) {
  // Apply the dbConnectMiddleware to all routes
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
    ),
  );

  app.post("/webhook", express.raw({ type: "application/json" }), (req, res) =>
    dependencies.webhookController.handleWebhook(req, res),
  );
}
