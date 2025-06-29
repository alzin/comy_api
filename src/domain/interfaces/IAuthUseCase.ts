export interface IAuthUseCase {
  register(
    email: string,
    name: string,
    category: string,
    password: string,
  ): Promise<void>;
  verifyEmail(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  refreshAccessToken(refreshToken: string): Promise<string>;
  changePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
