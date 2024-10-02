import { SubscriptionStatus } from "../../../domain/entities/SubscriptionStatus";
import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class UpdateSubscriptionStatusUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(subscription: any): Promise<void> {
    const user = await this.userRepository.findByStripeCustomerId(
      subscription.customer,
    );
    if (!user) return;

    const updatedFields = {
      stripeSubscriptionId: subscription.id,
      subscriptionPlan:
        subscription.items.data[0].plan.nickname || "Unknown Plan",
      subscriptionStatus: this.mapSubscriptionStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await this.userRepository.update(user.id!, updatedFields);
  }

  private mapSubscriptionStatus(status: string): SubscriptionStatus {
    const statusMap: { [key: string]: SubscriptionStatus } = {
      active: SubscriptionStatus.Active,
      paused: SubscriptionStatus.Paused,
      past_due: SubscriptionStatus.PastDue,
      canceled: SubscriptionStatus.Canceled,
      unpaid: SubscriptionStatus.Unpaid,
      trialing: SubscriptionStatus.Trialing,
      incomplete: SubscriptionStatus.Incomplete,
      incomplete_expired: SubscriptionStatus.IncompleteExpired,
    };
    return statusMap[status] || SubscriptionStatus.Incomplete;
  }
}
