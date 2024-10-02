import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../main/config/config";
import { ITokenService } from "../../domain/services/ITokenService";
import { IUserRepository } from "../../domain/repo/IUserRepository";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Define a regex pattern for paths that should be excluded
const excludedPaths = [
  "/webhook",
  "/auth/refresh",
  "/auth/register",
  "/auth/login",
  "/auth/verify-email",
  "/auth/forgot-password",
  /^\/auth\/reset-password\/[^\/]+$/ // Matches /auth/reset-password/<token> where <token> is any non-empty string
];


export const authMiddleware = (
  tokenService: ITokenService,
  userRepository: IUserRepository,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
   // Check if the current path matches any excluded path
   const isExcluded = excludedPaths.some(path => 
    typeof path === 'string' ? req.path === path : path.test(req.path)
  );

  if (isExcluded) {
    return next();
  }

    const accessToken = req.cookies[CONFIG.ACCESS_TOKEN_COOKIE_NAME];
    const refreshToken = req.cookies[CONFIG.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      console.log("Unauthorized, no refresh token");
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!accessToken) {
      console.log("Unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = (await tokenService.verify(
        accessToken,
        CONFIG.JWT_SECRET,
      )) as {
        userId: string;
      };
      const user = await userRepository.findById(decoded.userId);
      if (user) {
        req.user = user;
        return next();
      } else {
        return res.status(401).json({ error: "User not found" });
      }
    } catch (error) {
      console.log("Invalid or expired token", error);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
};
