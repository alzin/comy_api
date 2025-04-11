// src/modules/active-users-email/infra/ActiveUsersFetcher.ts
import { UserModel } from "../../../infra/database/models/UserModel";
import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";
import { ActiveUsersFetcherContract, ActiveUser } from "../domain/types";

export class ActiveUsersFetcher implements ActiveUsersFetcherContract {
  async getActiveUsers(): Promise<ActiveUser[]> {
    const users = await UserModel.find(
      { subscriptionStatus: "active" },
      { email: 1, name: 1, _id: 0 }
    ).lean();
    return users as ActiveUser[];
  }
}