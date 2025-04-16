//src/infra/services/BulkEmailSender.ts
import { CONFIG } from "../../main/config/config";
import { EmailSenderContract } from "../../domain/services/IEmailSender";
import { ActiveUser } from "../../domain/services/IActiveUsersFetcher";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export class BulkEmailSender implements EmailSenderContract {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: CONFIG.GMAIL_USER, pass: CONFIG.GMAIL_PASS },
  });

  async sendBulk(users: ActiveUser[], subject: string, htmlContent: string): Promise<void> {
    await Promise.all(
      users.map(user => {
        const personalizedContent = htmlContent.replace(/{{name}}/g, user.name || "my client");
        return this.transporter.sendMail({
          from: `my team <${CONFIG.GMAIL_USER}>`,
          to: user.email,
          subject,
          html: personalizedContent,
        });
      })
    );
  }
}