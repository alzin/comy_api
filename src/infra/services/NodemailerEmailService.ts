import nodemailer from "nodemailer";
import { IEmailService } from "../../domain/services/IEmailService";
import { CONFIG } from "../../main/config/config";
import { log } from "console";

export class NodemailerEmailService implements IEmailService {
  sendEmail = async (
    email: string,
    subject: string,
    content: string,
    isHtml: boolean = false,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      cid: string;
    }>,
  ) => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: CONFIG.GMAIL_USER,
          pass: CONFIG.GMAIL_PASS,
        },
      });

      const mailOptions = {
        from: CONFIG.GMAIL_USER,
        to: email,
        subject,
        [isHtml ? "html" : "text"]: content,
        attachments: attachments,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      log("Failed to send email:", error);
      throw new Error("Email sending failed");
    }
  };
}
