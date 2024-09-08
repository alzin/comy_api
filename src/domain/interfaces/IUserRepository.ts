import { User } from "../entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
