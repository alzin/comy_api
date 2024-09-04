export interface IAuthUseCase {
  register(email: string, name: string, password: string): Promise<void>;
  verifyEmail(token: string): Promise<string>;
  login(email: string, password: string): Promise<string>;
  changePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
