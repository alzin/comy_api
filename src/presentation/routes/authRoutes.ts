// src/routes/authRoutes.ts

import { Router, Request, Response } from "express";
import { AuthController } from "../controllers/AuthController";
import {
  validateRegisterInput,
  validateLoginInput,
  validateChangePasswordInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateVerifyEmailInput,
  validateRefreshTokenInput,
} from "../middlewares/validationMiddleware";

export const setupAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post(
    "/register",
    validateRegisterInput,
    (req: Request, res: Response) => authController.register(req, res),
  );

  router.get(
    "/verify-email",
    validateVerifyEmailInput,
    (req: Request, res: Response) => authController.verifyEmail(req, res),
  );

  router.post("/login", validateLoginInput, (req: Request, res: Response) =>
    authController.login(req, res),
  );

  router.post(
    "/refresh",
    validateRefreshTokenInput,
    (req: Request, res: Response) =>
      authController.refreshAccessToken(req, res),
  );

  router.post(
    "/change-password",
    validateChangePasswordInput,
    (req: Request, res: Response) => authController.changePassword(req, res),
  );

  router.post(
    "/forgot-password",
    validateForgotPasswordInput,
    (req: Request, res: Response) => authController.forgotPassword(req, res),
  );

  router.post(
    "/reset-password/:token",
    validateResetPasswordInput,
    (req: Request, res: Response) => authController.resetPassword(req, res),
  );
  router.post("/logout", (req: Request, res: Response) =>
    authController.logout(req, res),
  );

  return router;
};
