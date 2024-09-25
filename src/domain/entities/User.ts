// src/domain/entities/User.ts

export interface User {
  id?: string;
  email: string;
  name: string;
  category: string;
  profileImageUrl?: string | null;
  password: string;
  isEmailVerified: boolean;
  verificationToken?: string | null;
  stripeCustomerId?: string | null;
}
