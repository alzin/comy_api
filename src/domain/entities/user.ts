// src/domain/entities/User.ts

export interface User {
  id?: string;
  email: string;
  name: string;
  category: string;
  password: string;
  isEmailVerified: boolean;
  verificationToken?: string | null;
}
