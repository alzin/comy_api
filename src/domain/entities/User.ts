import { SubscriptionStatus } from "./SubscriptionStatus";

export interface User {
  id?: string;
  email: string;
  name: string;
  category: string;
  profileImageUrl?: string | null;
  password: string;
  isEmailVerified?: boolean;
  verificationToken?: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: Date;
  subscriptionPlan?: string;
  isOnline: boolean;
  // lastActive: string;
  referrerName?: string;

}