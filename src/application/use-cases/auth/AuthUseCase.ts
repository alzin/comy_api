import { log } from "console";
import { IAuthUseCase } from "../../../domain/interfaces/IAuthUseCase";
import { IUserRepository } from "../../../domain/repo/IUserRepository";
import { IEmailService } from "../../../domain/services/IEmailService";
import { IEncryptionService } from "../../../domain/services/IEncryptionService";
import { IRandomStringGenerator } from "../../../domain/services/IRandomStrGeneratorService";
import { ITokenService } from "../../../domain/services/ITokenService";
import { CONFIG } from "../../../main/config/config";

export class AuthUseCase implements IAuthUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService,
    private encryptionService: IEncryptionService,
    private tokenService: ITokenService,
    private randomStringGenerator: IRandomStringGenerator,
  ) {}

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
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
    } catch (error) {
      log(error);
      throw new Error("Invalid refresh token");
    }
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
      id: "",
      email,
      name,
      category,
      password: hashedPassword,
      isEmailVerified: false,
      verificationToken,
    });

    const verificationUrl = `${CONFIG.BASE_URL}auth/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmail(
      email,
      "Account Verification",
      `Please verify your account by clicking the link: \n${verificationUrl}`,
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

    const resetToken = this.randomStringGenerator.generate(32);
    await this.userRepository.update(user.id!, {
      verificationToken: resetToken,
    });

    const resetUrl = `${CONFIG.ORIGIN_URL}/update-password?token=${resetToken}`;
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
    await this.userRepository.update(user.id!, {
      password: hashedNewPassword,
      verificationToken: null,
    });
  }
}
