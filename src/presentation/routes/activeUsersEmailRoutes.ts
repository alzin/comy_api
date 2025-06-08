import { Router } from "express";
import { ActiveUsersEmailController } from "../controllers/ActiveUsersEmailController";
import { RequestHandler } from "express-serve-static-core";
import { CONFIG } from "../../main/config/config";

const apiKeyMiddleware: RequestHandler = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey === CONFIG.API_KEY) {
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
