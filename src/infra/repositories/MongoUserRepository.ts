import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { User } from "../../domain/entities/user";
import { UserModel } from "../models/userModel";
import { Types } from "mongoose";

export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const userDoc = await UserModel.findById(id);
    return userDoc ? this.documentToEntity(userDoc) : null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ email });
    return userDoc ? this.documentToEntity(userDoc) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ verificationToken: token });
    return userDoc ? this.documentToEntity(userDoc) : null;
  }

  async save(user: User): Promise<void> {
    const userDoc = this.entityToDocument(user);
    if (!userDoc._id) {
      delete userDoc._id; // Remove _id if it's null or undefined
    }
    await UserModel.create(userDoc);
  }

  async update(user: User): Promise<void> {
    if (!user.id) {
      throw new Error("Cannot update user without id");
    }
    const userDoc = this.entityToDocument(user);
    await UserModel.findByIdAndUpdate(user.id, userDoc);
  }

  private documentToEntity(doc: any): User {
    return User.create(
      doc.email,
      doc.name,
      doc.password,
      doc.isVerified,
      doc.verificationToken,
      doc._id.toString(),
    );
  }

  private entityToDocument(user: User): any {
    return {
      _id: user.id ? new Types.ObjectId(user.id) : undefined,
      email: user.email,
      name: user.name,
      password: user.password,
      isVerified: user.isVerified,
      verificationToken: user.verificationToken,
    };
  }
}
