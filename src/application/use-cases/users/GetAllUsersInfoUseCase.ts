import { UserInfo } from "../../../domain/entities/UserInfo";
import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class GetAllUsersInfoUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<UserInfo[]> {
    return this.userRepository.getAllUsersInfo();
  }
}
