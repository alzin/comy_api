// src/modules/active-users-email/presentation/activeUsersEmailRoutes.ts
import { Router } from "express";
import { ActiveUsersEmailController } from "./ActiveUsersEmailController";
import { RequestHandler } from "express-serve-static-core";

export function createActiveUsersEmailRoutes(
  controller: ActiveUsersEmailController,
  authMiddleware: RequestHandler,  
  adminMiddleware: RequestHandler  
): Router {
  const router = Router();
  router.post("/active-users/email", authMiddleware, adminMiddleware, (req, res) => controller.handle(req, res));
  return router;
}