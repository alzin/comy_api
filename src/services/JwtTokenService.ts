import { ITokenService } from "../interfaces/ITokenService";
import jwt from "jsonwebtoken";

export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || "";
    this.expiresIn = process.env.JWT_EXPIRES_IN || "1h";
  }

  async generate(payload: object): Promise<string> {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }
  async verify(token: string): Promise<object | null> {
    try {
      return jwt.verify(token, this.secret) as object;
    } catch (error) {
      return null;
    }
  }
}
