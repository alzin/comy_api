export interface EmailService {
  sendEmail(email: string, subject: string, text: string): Promise<void>;
}
