//src/infra/services/ActiveUsersFetcher.ts
import { UserModel } from "../database/models/UserModel";
import { SubscriptionStatus } from "../../domain/entities/SubscriptionStatus";
import { ActiveUsersFetcherContract, ActiveUser } from "../../domain/services/IActiveUsersFetcher";

export class ActiveUsersFetcher implements ActiveUsersFetcherContract {
  async getActiveUsers(): Promise<ActiveUser[]> {
    const users = await UserModel.find(
      { subscriptionStatus: "active" },
      { email: 1, name: 1, _id: 0 }
    ).lean();
    return users as ActiveUser[];
  }
}