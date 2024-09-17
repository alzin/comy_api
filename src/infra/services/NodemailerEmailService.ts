import nodemailer from "nodemailer";
import { IEmailService } from "../../domain/services/IEmailService";
import { CONFIG } from "../../main/config/config";
import { log } from "console";

export class NodemailerEmailService implements IEmailService {
  sendEmail = async (email: string, subject: string, text: string) => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: CONFIG.EMAIL_USER,
          pass: CONFIG.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: CONFIG.EMAIL_USER,
        to: email,
        subject,
        text,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      log("Failed to send email:", error);
      throw new Error("Email sending failed");
    }
  };
}
