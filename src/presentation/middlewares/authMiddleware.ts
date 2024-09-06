import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../main/config/config";
import { ITokenService } from "../../domain/interfaces/ITokenService";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { log } from "console";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (
  tokenService: ITokenService,
  userRepository: IUserRepository,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies[CONFIG.ACCESS_TOKEN_COOKIE_NAME];

    if (!token) {
      log("There was no JWT token in cookies ");
      return next();
    }

    try {
      const decoded = (await tokenService.verify(token, CONFIG.JWT_SECRET)) as {
        userId: string;
      };
      const user = await userRepository.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      log(error);
      // Token is invalid, but we'll just not set the user
    }

    next();
  };
};
