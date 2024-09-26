import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class UpdateUserNameUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(userId: string, newName: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        user.name = newName;
        await this.userRepository.update(user);
    }
}