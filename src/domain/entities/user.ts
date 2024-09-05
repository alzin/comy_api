export class User {
  constructor(
    public id: string | null,
    public email: string,
    public name: string,
    public password: string,
    public isVerified: boolean,
    public verificationToken: string | null,
  ) {}

  static create(
    email: string,
    name: string,
    password: string,
    isVerified: boolean = false,
    verificationToken: string | null = null,
    id: string | null = null,
  ): User {
    return new User(id, email, name, password, isVerified, verificationToken);
  }
}
