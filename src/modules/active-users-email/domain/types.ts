// src/modules/active-users-email/domain/types.ts
import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";

export interface ActiveUser {
  email: string;
  name?: string;  
}

export interface EmailSenderContract {
  sendBulk(users: ActiveUser[], subject: string, htmlContent: string): Promise<void>;
}

export interface ActiveUsersFetcherContract {
  getActiveUsers(): Promise<ActiveUser[]>;
}