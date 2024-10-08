// src/presentation/routes/userRoutes.ts

import { Router } from "express";
import { GetAllUsersInfoController } from "../controllers/GetAllUsersInfoController";
import { UpdateUserInfoController } from "../controllers/UpdateUserInfoController";
import { SearchUsersController } from "../controllers/SearchUsersController";
import { CheckSubscriptionStatusController } from "../controllers/CheckSubscriptionStatusController";

export function setupUserInfoRoutes(
  getAllUsersInfoController: GetAllUsersInfoController,
  updateUserInfoController: UpdateUserInfoController,
  searchUsersController: SearchUsersController,
  checkSubscriptionStatusController: CheckSubscriptionStatusController,
): Router {
  const router = Router();

  router.get("/all", (req, res) => getAllUsersInfoController.handle(req, res));

  router.patch("/", (req, res) => updateUserInfoController.handle(req, res));

  router.get("/search", (req, res) => searchUsersController.handle(req, res));

  router.get("/subscription-status", (req, res) =>
    checkSubscriptionStatusController.handle(req, res),
  );

  return router;
}
