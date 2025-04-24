import { IUserRepository } from '../../domain/repo/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserModel, UserDocument } from '../database/models/UserModel';
import { UserInfo } from '../../domain/entities/UserInfo';
import { PipelineStage } from 'mongoose';
import { SubscriptionStatus } from '../../domain/entities/SubscriptionStatus';

export class MongoUserRepository implements IUserRepository {
  private mapToDomain(userDoc: UserDocument): User {
    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      category: userDoc.category,
      password: userDoc.password,
      isEmailVerified: userDoc.isEmailVerified,
      verificationToken: userDoc.verificationToken || undefined,
      stripeCustomerId: userDoc.stripeCustomerId || undefined,
      stripeSubscriptionId: userDoc.stripeSubscriptionId || undefined,
      subscriptionStatus: userDoc.subscriptionStatus || SubscriptionStatus.Incomplete,
      currentPeriodEnd: userDoc.currentPeriodEnd,
      subscriptionPlan: userDoc.subscriptionPlan,
      profileImageUrl: userDoc.profileImageUrl,
      isOnline: userDoc.isOnline,
      lastActive: userDoc.lastActive,
    };
  }

  private mapToUserInfo(user: any): UserInfo {
    return {
      id: user._id.toString(),
      name: user.name,
      category: user.category,
      profileImageUrl: user.profileImageUrl || null,
    };
  }

  async create(user: User): Promise<User> {
    const newUser = new UserModel(user);
    const savedUser = await newUser.save();
    return this.mapToDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    return this.findOneAndMap({ _id: id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneAndMap({ email });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.findOneAndMap({ verificationToken: token });
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    return this.findOneAndMap({ stripeCustomerId });
  }

  async getAllUsersInfo(): Promise<UserInfo[]> {
    return this.findAndMapToUserInfo({});
  }
  async update(id: string, update: Partial<User>): Promise<User | null>;
 async update(userId: string, userData: Partial<User>): Promise<void>;
  async update(id: string, update: Partial<User>): Promise<User | null | void> {
    const updatedUser = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    if (arguments.length === 2 && arguments[1] === update) {
      return updatedUser ? this.mapToDomain(updatedUser) : null;
    } 
    return;
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      await UserModel.findByIdAndUpdate(userId, {
        isOnline,
        lastActive: new Date(),
      }).exec();
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  }

  async searchUsers(searchTerm: string): Promise<UserInfo[]> {
    const searchWords = searchTerm.split(' ').filter((word) => word.length > 0);
    const searchRegex = searchWords.map((word) => new RegExp(word, 'i'));

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { name: { $in: searchRegex } },
            { category: { $in: searchRegex } },
          ],
        },
      },
      {
        $addFields: {
          exactMatchScore: {
            $add: [
              { $cond: [{ $eq: ['$name', searchTerm] }, 2, 0] },
              { $cond: [{ $eq: ['$category', searchTerm] }, 2, 0] },
            ],
          },
          partialMatchScore: {
            $add: [
              { $size: { $setIntersection: [searchRegex, ['$name']] } },
              { $size: { $setIntersection: [searchRegex, ['$category']] } },
            ],
          },
        },
      },
      {
        $addFields: {
          totalScore: { $add: ['$exactMatchScore', '$partialMatchScore'] },
        },
      },
      { $sort: { totalScore: -1 } as any },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          profileImageUrl: 1,
        },
      },
    ];

    const users = await UserModel.aggregate(pipeline).exec();
    return users.map(this.mapToUserInfo);
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id).exec();
  }

  private async findOneAndMap(query: object): Promise<User | null> {
    const userDoc = await UserModel.findOne(query).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  private async findAndMapToUserInfo(query: object): Promise<UserInfo[]> {
    const users = await UserModel.find(query, 'name category profileImageUrl').lean().exec();
    return users.map(this.mapToUserInfo);
  }
}