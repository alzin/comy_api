import { Request, Response } from "express";
import { IAuthUseCase } from "../../domain/interfaces/IAuthUseCase";
import { CONFIG } from "../../main/config/config";
import { log } from "console";

export class AuthController {
  constructor(private authUseCase: IAuthUseCase) {}

  private setTokenCookie(res: Response, name: string, token: string): void {
    res.cookie(name, token, {
      httpOnly: true,
      secure: CONFIG.NODE_ENV === "production",
      sameSite: "none",
      maxAge:
        name === CONFIG.REFRESH_TOKEN_COOKIE_NAME
          ? 7 * 24 * 60 * 60 * 1000
          : 60 * 60 * 1000, // 7 days for refresh, 1 hour for access
    });
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, password } = req.body;
      await this.authUseCase.register(email, name, password);
      res.status(201).json({
        message:
          "User registered successfully. Please check your email for verification.",
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (typeof token !== "string") {
        res.status(400).json({ message: "Invalid token" });
        return;
      }

      const { accessToken, refreshToken } =
        await this.authUseCase.verifyEmail(token);

      this.setTokenCookie(res, CONFIG.ACCESS_TOKEN_COOKIE_NAME, accessToken);
      this.setTokenCookie(res, CONFIG.REFRESH_TOKEN_COOKIE_NAME, refreshToken);

      res.status(200).redirect(`${CONFIG.TERMS_URL}`);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await this.authUseCase.login(
        email,
        password,
      );

      this.setTokenCookie(res, CONFIG.ACCESS_TOKEN_COOKIE_NAME, accessToken);
      this.setTokenCookie(res, CONFIG.REFRESH_TOKEN_COOKIE_NAME, refreshToken);

      res.status(200).json({ message: "Login successful" });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Please verify your email before logging in") {
          res.status(401).json({ message: error.message });
        } else {
          res.status(400).json({ message: error.message });
        }
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }

  async refreshAccessToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies[CONFIG.REFRESH_TOKEN_COOKIE_NAME];

      if (!refreshToken) {
        throw new Error("No refresh token provided");
      }

      const newAccessToken =
        await this.authUseCase.refreshAccessToken(refreshToken);
      this.setTokenCookie(res, CONFIG.ACCESS_TOKEN_COOKIE_NAME, newAccessToken);

      res.status(200).json({ message: "Token refreshed successfully" });
    } catch (error) {
      log(error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      }
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, currentPassword, newPassword } = req.body;
      await this.authUseCase.changePassword(
        email,
        currentPassword,
        newPassword,
      );
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      await this.authUseCase.forgotPassword(email);
      res.status(200).json({
        message: "Password reset email sent. Please check your inbox.",
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;
      await this.authUseCase.resetPassword(token, newPassword);
      res.status(200).json({
        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  }
}
