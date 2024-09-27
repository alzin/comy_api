// src/presentation/routes/setupUserInfoRoutes.ts

import { Router } from "express";
import { GetAllUsersInfoController } from "../controllers/GetAllUsersInfoController";
import { UpdateUserNameController } from "../controllers/UpdateUserNameController";
import { SearchUsersController } from "../controllers/SearchUsersController";

export function setupUserInfoRoutes(
  getAllUsersInfoController: GetAllUsersInfoController,
  updateUserNameController: UpdateUserNameController,
  searchUsersController: SearchUsersController,
): Router {
  const router = Router();

  router.get("/all", (req, res) => getAllUsersInfoController.handle(req, res));

  router.patch("/name", (req, res) =>
    updateUserNameController.handle(req, res),
  );

  router.get("/search", (req, res) => searchUsersController.handle(req, res));

  return router;
}
