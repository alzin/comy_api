// src/presentation/middlewares/validationMiddleware.ts

import { Request, Response, NextFunction } from "express";
import { body, cookie, query, validationResult } from "express-validator";
import { CONFIG } from "../../main/config/config";

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateRegisterInput = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("name").notEmpty().withMessage("Name is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain a number")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter"),
  validateRequest,
];

export const validateLoginInput = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
  validateRequest,
];

export const validateChangePasswordInput = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("New password must contain a number")
    .matches(/[A-Z]/)
    .withMessage("New password must contain an uppercase letter"),
  validateRequest,
];

export const validateForgotPasswordInput = [
  body("email").isEmail().withMessage("Invalid email address"),
  validateRequest,
];

export const validateResetPasswordInput = [
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("New password must contain a number")
    .matches(/[A-Z]/)
    .withMessage("New password must contain an uppercase letter"),
  validateRequest,
];

export const validateVerifyEmailInput = [
  query("token").notEmpty().withMessage("Token is required"),
  validateRequest,
];

export const validateRefreshTokenInput = [
  cookie(CONFIG.REFRESH_TOKEN_COOKIE_NAME)
    .notEmpty()
    .withMessage("Refresh token is required"),
  validateRequest,
];
