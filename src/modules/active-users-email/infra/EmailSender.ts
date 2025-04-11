// src/modules/active-users-email/infra/EmailSender.ts
import nodemailer from "nodemailer";
import { CONFIG } from "../../../main/config/config";
import { EmailSenderContract, ActiveUser } from "../domain/types";

export class EmailSender implements EmailSenderContract {
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