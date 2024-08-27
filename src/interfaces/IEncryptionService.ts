export interface IEncryptionService {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}
