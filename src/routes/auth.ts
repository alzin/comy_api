import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/user";

dotenv.config();

const authRouter = Router();
const jwtSecret = process.env.JWT_SECRET as string;

const users: User[] = [];

const sendVerificationEmail = async (email: string, token: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mainOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Account Verification",
    text: `Please verify your account by clicking the link: \n${process.env.BASE_URL}/auth/verify-email?token=${token}`,
  };

  await transporter.sendMail(mainOptions);
};

const sendResetEmail = async (email: string, token: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset",
    text:
      `You requested a password reset. Please click on the link below to reset your password:\n\n` +
      `${process.env.BASE_URL}/auth/reset-password/${token}\n\n` +
      `If you did not request a password reset, please ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
};

authRouter.get("/users", async (req: Request, res: Response) => {
  return res.json(users);
});

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser: User = {
      email,
      name,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    };
    users.push(newUser);

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "User registered successfully. Please verify your email.",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Invalid or missing token" });
    }

    const user = users.find((user) => user.verificationToken === token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = "";

    res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.email }, jwtSecret, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/change-password", async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedNewPassword;

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = resetToken; // Reuse the verificationToken field or create a new one for reset tokens

    await sendResetEmail(email, resetToken);

    res
      .status(200)
      .json({ message: "Password reset email sent. Please check your inbox." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/reset-password/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = users.find((user) => user.verificationToken === token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedNewPassword;
    user.verificationToken = "";

    res.status(200).json({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default authRouter;
