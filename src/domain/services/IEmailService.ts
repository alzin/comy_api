export interface IEmailService {
  sendEmail(email: string, subject: string, text: string): Promise<void>;
}
