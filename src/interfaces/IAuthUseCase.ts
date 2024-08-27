export interface IAuthUseCase {
  register(emai: string, name: string, password: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  login(emai: string, password: string): Promise<string>;
  changePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
