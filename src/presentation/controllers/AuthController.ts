import { Request, Response } from "express";
import { IAuthUseCase } from "../../domain/interfaces/IAuthUseCase";

export class AuthController {
  constructor(private authUseCase: IAuthUseCase) {}

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
      const jwtToken = await this.authUseCase.verifyEmail(token);
      res.status(200).redirect(`${process.env.TERMS_URL}?token=${jwtToken}`);
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
      const token = await this.authUseCase.login(email, password);
      res.status(200).json({ token });
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
