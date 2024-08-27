import nodemailer from "nodemailer";
import { IEmailService } from "../interfaces/IEmailService";

export class NodemailerEmailService implements IEmailService {
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
