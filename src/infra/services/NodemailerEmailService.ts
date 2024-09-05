import nodemailer from "nodemailer";
import { IEmailService } from "../../domain/interfaces/IEmailService";
import env from "../../main/config/env";
import { log } from "console";

export class NodemailerEmailService implements IEmailService {
  sendEmail = async (email: string, subject: string, text: string) => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.email,
          pass: env.pass,
        },
      });
  
      const mailOptions = {
        from: env.email,
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
