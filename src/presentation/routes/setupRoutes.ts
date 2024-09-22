import express from "express";

import { setupBusinessSheetRoutes } from "./BusinessSheetRoutes";
import { authMiddleware } from "../middlewares/authMiddleware";
import { setupAuthRoutes } from "./authRoutes";

export function setupRoutes(app: express.Application, dependencies: any) {
  app.get("/", (_, res) => res.status(200).send("OK"));

  app.use(
    authMiddleware(dependencies.tokenService, dependencies.userRepository),
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
}
