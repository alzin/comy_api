// src/main/types/express.d.ts

import express from "express";
import { Multer } from "multer";

declare global {
  namespace Express {
    interface Request {
      files?: {
        headerBackgroundImage?: Multer.File[];
        profileImage?: Multer.File[];
        referralSheetBackgroundImage?: Multer.File[];
      };
    }
  }
}
