import mongoose from 'mongoose';
import { IUserRepository } from '../../domain/repo/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserModel, UserDocument } from '../database/models/UserModel';
import { UserInfo } from '../../domain/entities/UserInfo';
import { PipelineStage } from 'mongoose';
import { SubscriptionStatus } from '../../domain/entities/SubscriptionStatus';

export class MongoUserRepository implements IUserRepository {
  updateUserStatus(userId: string, isOnline: boolean): Promise<boolean> {
  console.log('Method not implemented.');
  return Promise.resolve(false); 
}
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
      referrerName: userDoc.referrerName

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

  async isValidId(id: string): Promise<boolean> {
    return mongoose.Types.ObjectId.isValid(id);
  }

  async create(user:User): Promise<User> {
    const newUser = new UserModel(user);
    const savedUser = await newUser.save();
    return this.mapToDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    if (!(await this.isValidId(id))) {
      return null;
    }
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

  async findActiveUsers(): Promise<User[]> {
    const users = await UserModel.find({
      email: { $ne: 'virtual@chat.com' },
      isEmailVerified: true,
    }).exec();
    const mappedUsers = users.map(user => this.mapToDomain(user));
    console.log('Active users fetched:', mappedUsers.map(u => ({ id: u.id, email: u.email, name: u.name, isEmailVerified: u.isEmailVerified })));
    return mappedUsers;
  }

  async getAllUsersInfo(): Promise<UserInfo[]> {
    return this.findAndMapToUserInfo({});
  }
  
  async update(userId: string, userData: Partial<User>): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: userData }).exec();
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
      { $addFields: { totalScore: { $add: ['$exactMatchScore', '$partialMatchScore'] } } },
      { $sort: { totalScore: -1 } as any },
      { $project: { _id: 1, name: 1, category: 1, profileImageUrl: 1 } },
    ];

    const users = await UserModel.aggregate(pipeline).exec();
    return users.map(this.mapToUserInfo);
  }

  async delete(id: string): Promise<void> {
    if (!(await this.isValidId(id))) {
      return;
    }
    await UserModel.findByIdAndDelete(id).exec();
  }

  private async findOneAndMap(query: { [key: string]: any }): Promise<User | null> {
    const userDoc = await UserModel.findOne(query).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  private async findAndMapToUserInfo(query: { [key: string]: any }): Promise<UserInfo[]> {
    const users = await UserModel.find(query, 'name category profileImageUrl').lean().exec();
    return users.map(this.mapToUserInfo);
  }
}