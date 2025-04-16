import { Router } from "express";
import { ActiveUsersEmailController } from "../controllers/ActiveUsersEmailController";
import { RequestHandler } from "express-serve-static-core";
import dotenv from "dotenv";

dotenv.config();  

const apiKeyMiddleware: RequestHandler = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey === process.env.API_KEY) {  
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
