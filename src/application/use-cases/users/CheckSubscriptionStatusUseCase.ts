import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";
import { MongoUserRepository } from "../../../infra/repo/MongoUserRepository";

export class CheckSubscriptionStatusUseCase {
  constructor(private userRepository: MongoUserRepository) {}

  async execute(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.Active,
      SubscriptionStatus.Trialing,
    ];

    const isStatusActive = activeStatuses.includes(user.subscriptionStatus);
    const isWithinPeriod = user.currentPeriodEnd
      ? new Date() < user.currentPeriodEnd
      : false;

    return isStatusActive && isWithinPeriod;
  }
}
