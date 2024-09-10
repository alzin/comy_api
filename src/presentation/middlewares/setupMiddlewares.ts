import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CONFIG } from "../../main/config/config";

export function setupMiddlewares(app: express.Application) {
  const corsOptions = {
    origin: CONFIG.ORIGIN_URL,
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
}
