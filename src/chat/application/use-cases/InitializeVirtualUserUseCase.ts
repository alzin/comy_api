import mongoose from 'mongoose';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { User } from '../../../domain/entities/User';
import { SubscriptionStatus } from '../../../domain/entities/SubscriptionStatus';

export class InitializeVirtualUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<string> {
    const virtualUserEmail = 'virtual@chat.com';
    let virtualUser = await this.userRepository.findByEmail(virtualUserEmail);

    if (!virtualUser) {
      virtualUser = {
        id: new mongoose.Types.ObjectId().toString(),
        email: virtualUserEmail,
        password: 'virtual_password',
        name: 'COMY オフィシャル AI',
        category: 'bot',
        isOnline: true,
        subscriptionStatus: SubscriptionStatus.Active,
        lastActive: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
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