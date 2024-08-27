import { IAuthUseCase } from "../interfaces/IAuthUseCase";
import { IEmailService } from "../interfaces/IEmailService";
import { IEncryptionService } from "../interfaces/IEncryptionService";
import { ITokenService } from "../interfaces/ITokenService";
import { IUserRepository } from "../interfaces/IUserRepository";
import crypto from "crypto";

export class AuthUseCase implements IAuthUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService,
    private encryptionService: IEncryptionService,
    private tokenService: ITokenService,
  ) {}

  async register(email: string, name: string, password: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await this.encryptionService.hash(password);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await this.userRepository.save({
      id: "",
      email,
      name,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });

    const verificationUrl = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmail(
      email,
      "Account Verification",
      `Please verify your account by clicking the link: \n${verificationUrl}`,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error("Invalid or expired token");
    }

    user.isVerified = true;
    user.verificationToken = null;
    await this.userRepository.update(user);
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new Error("Please verify your email before logging in");
    }

    const isPasswordValid = await this.encryptionService.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    return this.tokenService.generate({ id: user.id, email: user.email });
  }

  async changePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await this.encryptionService.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const hashedNewPassword = await this.encryptionService.hash(newPassword);
    user.password = hashedNewPassword;
    await this.userRepository.update(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = resetToken;
    await this.userRepository.update(user);

    const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
    await this.emailService.sendEmail(
      email,
      "Password Reset",
      `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request a password reset, please ignore this email.`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error("Invalid or expired token");
    }

    const hashedNewPassword = await this.encryptionService.hash(newPassword);
    user.password = hashedNewPassword;
    user.verificationToken = null;
    await this.userRepository.update(user);
  }
}
