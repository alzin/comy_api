//src/domain/services/IEmailSender.ts
import { ActiveUser } from "./IActiveUsersFetcher";

export interface EmailSenderContract {
  sendBulk(users: ActiveUser[], subject: string, htmlContent: string): Promise<void>;
}