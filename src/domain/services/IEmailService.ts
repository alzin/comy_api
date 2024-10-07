export interface IEmailService {
  sendEmail(
    email: string,
    subject: string,
    content: string,
    isHtml?: boolean,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      cid: string;
    }>,
  ): Promise<void>;
}
