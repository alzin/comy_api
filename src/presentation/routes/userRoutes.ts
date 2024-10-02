// src/presentation/routes/setupUserInfoRoutes.ts

import { Router } from "express";
import { GetAllUsersInfoController } from "../controllers/GetAllUsersInfoController";
import { UpdateUserInfoController } from "../controllers/UpdateUserInfoController";
import { SearchUsersController } from "../controllers/SearchUsersController";

export function setupUserInfoRoutes(
  getAllUsersInfoController: GetAllUsersInfoController,
  updateUserInfoController: UpdateUserInfoController,
  searchUsersController: SearchUsersController,
): Router {
  const router = Router();

  router.get("/all", (req, res) => getAllUsersInfoController.handle(req, res));

  router.patch("/", (req, res) => updateUserInfoController.handle(req, res));

  router.get("/search", (req, res) => searchUsersController.handle(req, res));

  return router;
}
