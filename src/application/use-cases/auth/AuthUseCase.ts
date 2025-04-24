import { log } from "console";
import { IAuthUseCase } from "../../../domain/interfaces/IAuthUseCase";
import { IUserRepository } from "../../../domain/repo/IUserRepository";
import { IEmailService } from "../../../domain/services/IEmailService";
import { IEncryptionService } from "../../../domain/services/IEncryptionService";
import { IRandomStringGenerator } from "../../../domain/services/IRandomStrGeneratorService";
import { ITokenService } from "../../../domain/services/ITokenService";
import { CONFIG } from "../../../main/config/config";
import fs, { readFileSync } from "fs";
import path, { join, resolve } from "path";
import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";
import { hash } from "crypto";
import { create } from "domain";
import { register } from "module";

export class AuthUseCase implements IAuthUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService,
    private encryptionService: IEncryptionService,
    private tokenService: ITokenService,
    private randomStringGenerator: IRandomStringGenerator,
  ) {}

  async refreshAccessToken(refreshToken: string): Promise<string> {
      const decoded = (await this.tokenService.verify(
        refreshToken,
        CONFIG.REFRESH_TOKEN_SECRET,
      )) as { userId: string } | null;

      if (!decoded || !decoded.userId) {
        throw new Error("Invalid refresh token");
      }

      return await this.tokenService.generate(
        { userId: decoded.userId },
        CONFIG.JWT_SECRET,
        CONFIG.JWT_EXPIRATION,
      );
  }

  async register(
    email: string,
    name: string,
    category: string,
    password: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await this.encryptionService.hash(password);
    const verificationToken = this.randomStringGenerator.generate(32);

    await this.userRepository.create({
      email,
      name,
      category,
      password: hashedPassword,
      isEmailVerified: false,
      verificationToken,
      subscriptionStatus: SubscriptionStatus.Incomplete,
      profileImageUrl: undefined,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      currentPeriodEnd: undefined,
      subscriptionPlan: undefined,
      isOnline: false,
      lastActive: new Date(),
    });

    const verificationUrl = `${CONFIG.SERVER_URL}auth/verify-email?token=${verificationToken}`;

    const templatePath = path.resolve(
      __dirname,
      "../../../../assets/html/email-template.html",
    );
    let emailTemplate = fs.readFileSync(templatePath, "utf8");

    const re = /{{verificationUrl}}/g;
    emailTemplate = emailTemplate.replace(re, verificationUrl);
    emailTemplate = emailTemplate.replace("{{USER_NAME}}", name);

    // Read the logo file
    const logoPath = path.join(__dirname, "../../../../assets/images/logo.jpg");
    const logoAttachment = fs.readFileSync(logoPath);

    await this.emailService.sendEmail(
      email,
      "【COMY】メールアドレスの確認",
      emailTemplate,
      true, // Set to true for HTML email
      [
        {
          filename: "logo.jpg",
          content: logoAttachment,
          cid: "companyLogo",
        },
      ],
    );
  }
  
  async verifyEmail(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error("Invalid or expired token");
    }

    await this.userRepository.update(user.id!, {
      isEmailVerified: true,
      verificationToken: null,
    });

    const accessToken = await this.tokenService.generate(
      { userId: user.id },
      CONFIG.JWT_SECRET,
      CONFIG.JWT_EXPIRATION,
    );
    const refreshToken = await this.tokenService.generate(
      { userId: user.id },
      CONFIG.REFRESH_TOKEN_SECRET,
      CONFIG.REFRESH_TOKEN_EXPIRATION,
    );

    return { accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isEmailVerified) {
      throw new Error("Please verify your email before logging in");
    }

    const isPasswordValid = await this.encryptionService.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const accessToken = await this.tokenService.generate(
      { userId: user.id },
      CONFIG.JWT_SECRET,
      CONFIG.JWT_EXPIRATION,
    );
    const refreshToken = await this.tokenService.generate(
      { userId: user.id },
      CONFIG.REFRESH_TOKEN_SECRET,
      CONFIG.REFRESH_TOKEN_EXPIRATION,
    );

    return { accessToken, refreshToken };
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
    await this.userRepository.update(user.id!, { password: hashedNewPassword });
  }

 
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.isEmailVerified) {
      throw new Error("Please verify your email before resetting your password");
    }

    const resetToken = this.randomStringGenerator.generate(32);
    await this.userRepository.update(user.id!, {
      verificationToken: resetToken,
    });

    const resetUrl = `${CONFIG.FRONT_URL}/reset-password?token=${resetToken}`;
    // Read the forgot password email template
    const templatePath = path.join(
      __dirname,
      "../../../../assets/html/forgot-password-template.html",
    );
    let emailTemplate = fs.readFileSync(templatePath, "utf8");

    // Replace placeholders in the template
    emailTemplate = emailTemplate.replace("{{resetUrl}}", resetUrl);
    emailTemplate = emailTemplate.replace("{{USER_NAME}}", user.name);

    // Read the logo file
    const logoPath = path.join(__dirname, "../../../../assets/images/logo.jpg");
    const logoAttachment = fs.readFileSync(logoPath);

    await this.emailService.sendEmail(
      email,
      "【COMY】パスワードリセットのご案内",
      emailTemplate,
      true, // Set to true for HTML email
      [
        {
          filename: "logo.jpg",
          content: logoAttachment,
          cid: "companyLogo",
        },
      ],
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error("Invalid or expired token");
    }

    const hashedNewPassword = await this.encryptionService.hash(newPassword);
    await this.userRepository.update(user.id!, {
      password: hashedNewPassword,
      verificationToken: null,
    });
  }
}
