import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { User } from "../../domain/models/user";
import { v4 as uuidv4 } from "uuid";

export class UserRepository implements IUserRepository {
  users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) || null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.users.find((user) => user.verificationToken === token) || null;
  }

  async save(user: User): Promise<void> {
    const existingUserIndex = this.users.findIndex((u) => u.id === user.id);
    if (existingUserIndex !== -1) {
      this.users[existingUserIndex] = user;
    } else {
      user.id = uuidv4();
      this.users.push(user);
    }
  }

  async update(user: User): Promise<void> {
    const existingUserIndex = this.users.findIndex((u) => u.id === user.id);
    if (existingUserIndex !== -1) {
      this.users[existingUserIndex] = user;
    } else {
      throw new Error("User not found");
    }
  }
}
