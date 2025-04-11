// src/modules/active-users-email/application/SendActiveUsersEmailUseCase.ts
import { EmailSenderContract, ActiveUsersFetcherContract } from "../domain/types";

export class SendActiveUsersEmailUseCase {
  constructor(
    private usersFetcher: ActiveUsersFetcherContract,
    private emailSender: EmailSenderContract,
  ) {}

  async execute(subject: string, htmlContent: string): Promise<{ sentCount: number }> {
    const activeUsers = await this.usersFetcher.getActiveUsers();
    if (activeUsers.length === 0) {
      throw new Error("There are no active users to send emails to");
    }
    await this.emailSender.sendBulk(activeUsers, subject, htmlContent);
    return { sentCount: activeUsers.length };
  }
}