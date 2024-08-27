// src/presentation/routes/authRoutes.ts

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

export const setupAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post("/register", (req, res) => authController.register(req, res));

  router.get("/verify-email", (req, res) =>
    authController.verifyEmail(req, res),
  );

  router.post("/login", (req, res) => authController.login(req, res));

  router.post("/change-password", (req, res) =>
    authController.changePassword(req, res),
  );

  router.post("/forgot-password", (req, res) =>
    authController.forgotPassword(req, res),
  );

  router.post("/reset-password/:token", (req, res) =>
    authController.resetPassword(req, res),
  );

  return router;
};
