import { ITokenService } from "../../domain/services/ITokenService";
import jwt from "jsonwebtoken";
import { log } from "console";

export class JwtTokenService implements ITokenService {
  async generate(
    payload: object,
    key: string,
    expiresIn: string,
  ): Promise<string> {
    return jwt.sign(payload, key, {
      expiresIn: expiresIn,
    });
  }
  async verify(token: string, key: string): Promise<object | null> {
    try {
      return jwt.verify(token, key) as object;
    } catch (error) {
      log(error);
      return null;
    }
  }
}
