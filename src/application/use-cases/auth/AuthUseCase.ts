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
    });
  
    const verificationUrl = `${CONFIG.SERVER_URL}auth/verify-email?token=${verificationToken}`;

    const templatePath = path.resolve(
      __dirname,
      "../../../../assets/html/email-template.html",
    );
    let emailTemplate = fs.readFileSync(templatePath, "utf8");
  
    emailTemplate = emailTemplate.replace("{{title}}", "【COMY】メールアドレスの確認");
    emailTemplate = emailTemplate.replace("{{userName}}", name);
    emailTemplate = emailTemplate.replace(
      "{{message1}}",
      "この度は、【COMY】にご登録いただきまして誠にありがとうございます。<br>※このメールは、【COMY】にご登録いただいたメールアドレス宛に自動的に送信しています。"
    );
    emailTemplate = emailTemplate.replace(
      "{{message2}}",
      "以下のリンクをクリックして、メールアドレスの認証を完了してください。<br>メールアドレスの認証リンク:"
    );
    emailTemplate = emailTemplate.replace("{{buttonUrl}}", verificationUrl);
    emailTemplate = emailTemplate.replace("{{buttonText}}", "アカウントを有効化する");
    emailTemplate = emailTemplate.replace(
      "{{message3}}",
      "このリンクの有効期限は24時間です。期限を過ぎますと、再度登録手続きを行っていただく必要がございますのでご注意ください。"
    );
    emailTemplate = emailTemplate.replace(
      "{{message4}}",
      "もし本メールにお心当たりがない場合は、お手数ですがこのまま削除いただきますようお願い申し上げます。"
    );
    emailTemplate = emailTemplate.replace(
      "{{message5}}",
      "ご不明な点やお困りの際は、以下のメールアドレスまでお問い合わせください。"
    );
  
    const logoPath = path.join(__dirname, "../../../../assets/images/logo.jpg");
    const logoAttachment = fs.readFileSync(logoPath);
  
    await this.emailService.sendEmail(
      email,
      "【COMY】メールアドレスの確認",
      emailTemplate,
      true,
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
  const resetToken = this.randomStringGenerator.generate(32);
  await this.userRepository.update(user.id!, {
    verificationToken: resetToken,
  });

  const resetUrl = `${CONFIG.FRONT_URL}/reset-password?token=${resetToken}`;

  const templatePath = path.join(
    __dirname,
    "../../../../assets/html/email-template.html",
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");

  emailTemplate = emailTemplate.replace("{{title}}", "【COMY】パスワードリセットのご案内");
  emailTemplate = emailTemplate.replace("{{userName}}", user.name);
  emailTemplate = emailTemplate.replace("{{message1}}", "【COMY】をご利用いただき、誠にありがとうございます");
  emailTemplate = emailTemplate.replace("{{message2}}"," パスワードリセットのリクエストを受け付けました。以下のボタンをクリックして、新しいパスワードを設定してください。");
  emailTemplate = emailTemplate.replace("{{buttonUrl}}", resetUrl);
  emailTemplate = emailTemplate.replace("{{buttonText}}"," パスワードをリセット");
  emailTemplate = emailTemplate.replace("{{message3}}", "このリンクの有効期限は24時間です。期限を過ぎますと、再度パスワードリセットの手続きを行っていただく必要がございますのでご注意ください。");
  emailTemplate=emailTemplate.replace("{{message4}}","もしパスワードリセットをリクエストした覚えがない場合は、このメールを無視していただいて構いません。アカウントは安全な状態が保たれています。");
  emailTemplate=emailTemplate.replace("{{message5}}","ご不明な点やお困りの際は、以下のメールアドレスまでお問い合わせください。");
  const logoPath = path.join(__dirname, "../../../../assets/images/logo.jpg");
  const logoAttachment = fs.readFileSync(logoPath);

  await this.emailService.sendEmail(
    email,
    "【COMY】パスワードリセットのご案内",
    emailTemplate,
    true,
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
