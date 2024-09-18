// src/infrastructure/repositories/UserRepository.ts

import { IUserRepository } from "../../domain/repo/IUserRepository";
import { User } from "../../domain/entities/User";
import { UserDocument, UserModel } from "../models/UserSchema";

export class UserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const newUser = new UserModel(user);
    const savedUser = await newUser.save();
    return this.mapToDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const userDoc = await UserModel.findById(id).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ email }).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({
      verificationToken: token,
    }).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async update(user: User): Promise<void> {
    await UserModel.findByIdAndUpdate(user.id, user).exec();
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id).exec();
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
    };
  }
}
