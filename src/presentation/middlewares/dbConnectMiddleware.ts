// src/presentation/middlewares/dbConnectMiddleware.ts

import { Request, Response, NextFunction } from "express";
import connectToDatabase from "../../infra/database/database";

export const dbConnectMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
