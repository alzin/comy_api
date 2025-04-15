// src/modules/active-users-email/presentation/activeUsersEmailRoutes.ts
import { Router } from "express";
import { ActiveUsersEmailController } from "./ActiveUsersEmailController";
import { RequestHandler } from "express-serve-static-core";

const apiKeyMiddleware: RequestHandler = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey === "TEST_KEY_123") {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    error: "Invalid API Key" 
  });
};

export function createActiveUsersEmailRoutes(
  controller: ActiveUsersEmailController
): Router {
  const router = Router();
  
  router.post(
    "/active-users/email", 
    apiKeyMiddleware,
    (req, res) => controller.handle(req, res)
  );
  
  return router;
}

