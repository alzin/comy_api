import bcrypt from "bcryptjs";
import { IEncryptionService } from "../../domain/interfaces/IEncryptionService";

export class BcryptPasswordHasher implements IEncryptionService {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }
  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
