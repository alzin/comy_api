// src/domain/entities/User.ts

export interface User {
  id?: string;
  email: string;
  name: string;
  password: string;
  isVerified: boolean;
  verificationToken?: string | null;
  businessSheetId?: string;
}