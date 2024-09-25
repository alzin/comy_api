import { User } from "../entities/User";
import { UserInfo } from "../entities/UserInfo";

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  getAllUsersInfo(): Promise<UserInfo[]>;
  update(user: User): Promise<void>;
}
