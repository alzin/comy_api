import nodemailer from "nodemailer";
import { EmailService } from "../interfaces/email.service.interface";

export class NodemailerEmailService implements EmailService {
  sendEmail = async (email: string, subject: string, text: string) => {
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
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
  };
}
