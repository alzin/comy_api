// src/presentation/routes/businessSheetRoutes.ts

import { Router } from "express";
import { BusinessSheetController } from "../controllers/BusinessSheetController";
import { upload } from "../middlewares/uploadMiddleware";

export function setupBusinessSheetRoutes(
  controller: BusinessSheetController,
): Router {
  const router = Router();

  router.post(
    "/",
    upload.fields([
      { name: "headerBackgroundImage", maxCount: 1 },
      { name: "profileImage", maxCount: 1 },
      { name: "referralSheetBackgroundImage", maxCount: 1 },
    ]),
    (req, res) => controller.createBusinessSheet(req, res),
  );
  router.put(
    "/",
    upload.fields([
      { name: "headerBackgroundImage", maxCount: 1 },
      { name: "profileImage", maxCount: 1 },
      { name: "referralSheetBackgroundImage", maxCount: 1 },
    ]),
    (req, res) => controller.editBusinessSheet(req, res),
  );

  router.get("/", (req, res) => controller.getBusinessSheet(req, res));
  router.get("/:userId", (req, res) => controller.getBusinessSheet(req, res));

  router.post("/:id/share", (req, res) =>
    controller.shareBusinessSheet(req, res),
  );

  return router;
}
