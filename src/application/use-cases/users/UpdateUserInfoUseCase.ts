// src/application/use-cases/users/UpdateUserInfoUseCase.ts

import { User } from "../../../domain/entities/User";
import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class UpdateUserInfoUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, userData: Partial<User>): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    await this.userRepository.update(userId, userData);
  }
}