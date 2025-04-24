import { User } from "../entities/User";
import { UserInfo } from "../entities/UserInfo";

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;
  getAllUsersInfo(): Promise<UserInfo[]>;
  update(userId: string, userData: Partial<User>): Promise<void>;
  searchUsers(searchTerm: string): Promise<UserInfo[]>;
  //chat
  update(id: string, update: Partial<User>): Promise<User | null>;
  update(userId: string, userData: Partial<User>): Promise<void>;
  updateUserStatus(userId: string, isOnline: boolean): Promise<boolean>;
  delete(id: string): Promise<void>;
}
