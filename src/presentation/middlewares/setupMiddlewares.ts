import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CONFIG } from "../../main/config/config";

export function setupMiddlewares(app: express.Application) {
  const corsOptions = {
    origin: CONFIG.FRONT_URL,
    credentials: true,
  };

  app.use(cors(corsOptions));

  // Apply the JSON middleware globally, but it will be excluded for the webhook route.
  app.use((req, res, next) => {
    if (req.originalUrl === "/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  app.use(cookieParser());
}