import { UserInfo } from "../../../domain/entities/UserInfo";
import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class SearchUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(searchTerm: string): Promise<UserInfo[]> {
    return this.userRepository.searchUsers(searchTerm);
  }
}
