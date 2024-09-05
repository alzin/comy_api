import { ITokenService } from "../../domain/interfaces/ITokenService";
import jwt from "jsonwebtoken";
import env from "../../main/config/env";
import { log } from "console";

export class JwtTokenService implements ITokenService {
  async generate(payload: object): Promise<string> {
    return jwt.sign(payload, env.secret, { expiresIn: env.expireIn });
  }
  async verify(token: string): Promise<object | null> {
    try {
      return jwt.verify(token, env.secret) as object;
    } catch (error) {
      log(error);
      return null;
    }
  }
}
