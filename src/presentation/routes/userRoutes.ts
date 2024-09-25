// src/presentation/routes/setupUserInfoRoutes.ts

import { Router } from "express";
import { GetAllUsersInfoController } from "../controllers/GetAllUsersInfoController";

export function setupUserInfoRoutes(
  getAllUsersInfoController: GetAllUsersInfoController,
): Router {
  const router = Router();

  router.get("/", (req, res) => getAllUsersInfoController.handle(req, res));

  return router;
}
