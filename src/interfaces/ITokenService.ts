export interface ITokenService {
  generate(payload: object): Promise<string>;
  verify(token: string): Promise<object | null>;
}
