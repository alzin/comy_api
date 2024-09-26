// src/presentation/routes/setupUserInfoRoutes.ts

import { Router } from "express";
import { GetAllUsersInfoController } from "../controllers/GetAllUsersInfoController";
import { UpdateUserNameController } from "../controllers/UpdateUserNameController";

export function setupUserInfoRoutes(
  getAllUsersInfoController: GetAllUsersInfoController,
  updateUserNameController: UpdateUserNameController
): Router {
  const router = Router();

  router.get("/all", (req, res) => getAllUsersInfoController.handle(req, res));
  router.patch("/name", (req, res) => updateUserNameController.handle(req, res));

  return router;
}