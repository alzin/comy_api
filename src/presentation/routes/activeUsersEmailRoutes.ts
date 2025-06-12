import { Router } from "express";
import { ActiveUsersEmailController } from "../controllers/ActiveUsersEmailController";
import { apiKeyMiddleware } from "../middlewares/apiKeyMiddleware";


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
