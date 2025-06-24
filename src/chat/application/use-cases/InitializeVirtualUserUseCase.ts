///src/chat/application/use-cases/InitializeVirtualUserUseCase.ts
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';
import { CONFIG } from '../../../main/config/config';

export class InitializeVirtualUserUseCase {
  private virtualUserEmail = CONFIG.VIRTUAL_USER_EMAIL;
  private virtualUserPassword = CONFIG.VIRTUAL_USER_PASSWORD;

  constructor(private userRepository: IUserRepository) { }

  async execute(): Promise<string> {

    let virtualUser = await this.userRepository.findByEmail(this.virtualUserEmail);

    if (!virtualUser) {
      virtualUser = {
        email: this.virtualUserEmail,
        password: this.virtualUserPassword,
        name: CONFIG.BOT_NAME,
        category: 'bot',
        isOnline: true,
        subscriptionStatus: SubscriptionStatus.Active,
      };
      await this.userRepository.create(virtualUser as User);
      console.log('Virtual user created:', this.virtualUserEmail);
    } else {
      console.log('Virtual user already exists:', this.virtualUserEmail);
    }

    console.log('Virtual chat bot initialized successfully');
    return virtualUser.id;
  }
}