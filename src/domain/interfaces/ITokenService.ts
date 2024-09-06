export interface ITokenService {
  generate(payload: object, key: string, expiresIn: string): Promise<string>;
  verify(token: string, key: string): Promise<object | null>;
}
