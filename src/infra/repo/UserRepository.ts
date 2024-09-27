// src/infrastructure/repositories/UserRepository.ts

import { IUserRepository } from "../../domain/repo/IUserRepository";
import { User } from "../../domain/entities/User";
import { UserModel, UserDocument } from "../database/models/UserModel";
import { UserInfo } from "../../domain/entities/UserInfo";

export class UserRepository implements IUserRepository {
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

  async getAllUsersInfo(): Promise<UserInfo[]> {
    return this.findAndMapToUserInfo({});
  }

  async update(user: User): Promise<void> {
    await UserModel.findByIdAndUpdate(user.id, user).exec();
  }

  async searchUsers(searchTerm: string): Promise<UserInfo[]> {
    const searchRegex = { $regex: searchTerm, $options: "i" };
    return this.findAndMapToUserInfo({
      $or: [{ name: searchRegex }, { category: searchRegex }],
    });
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id).exec();
  }

  private async findOneAndMap(query: object): Promise<User | null> {
    const userDoc = await UserModel.findOne(query).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  private async findAndMapToUserInfo(query: object): Promise<UserInfo[]> {
    const users = await UserModel.find(query, "name category profileImageUrl")
      .lean()
      .exec();
    return users.map(this.mapToUserInfo);
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
}
