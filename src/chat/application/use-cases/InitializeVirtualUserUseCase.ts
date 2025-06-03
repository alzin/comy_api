///src/chat/application/use-cases/InitializeVirtualUserUseCase.ts
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';

export class InitializeVirtualUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<string> {
    const virtualUserEmail = process.env.VIRTUAL_USER_EMAIL;
    let virtualUser = await this.userRepository.findByEmail(virtualUserEmail);

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

    if (!virtualUser) {
      virtualUser = {
        id: generateId(),
        email: virtualUserEmail,
        password: process.env.VIRTUAL_USER_PASSWORD,
        name: 'COMY オフィシャル AI',
        category: 'bot',
        isOnline: true,
        subscriptionStatus: SubscriptionStatus.Active,
        //lastActive: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      };
      await this.userRepository.create(virtualUser as User);
      console.log('Virtual user created:', virtualUserEmail);
    } else {
      console.log('Virtual user already exists:', virtualUserEmail);
    }

    if (!virtualUser || !virtualUser.id) {
      throw new Error('Failed to initialize virtual user');
    }

    console.log('Virtual chat bot initialized successfully');
    return virtualUser.id;
  }
}