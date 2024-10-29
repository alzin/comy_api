import { json, Request, Response } from "express";
import { IAuthUseCase } from "../../../src/domain/interfaces/IAuthUseCase";
import { CONFIG } from "../../../src/main/config/config";
import { AuthController } from "../../../src/presentation/controllers/AuthController";

describe("AuthController", () => {
  let authController: AuthController;
  let mockAuthUseCase: jest.Mocked<IAuthUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockAuthUseCase = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    authController = new AuthController(mockAuthUseCase);

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
      cookie: jest.fn(),
    };
  });

  describe("register", () => {
    it("should register a user successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        name: "Test User",
        category: "AI engineer",
        password: "password123",
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.register).toHaveBeenCalledWith(
        "test@example.com",
        "Test User",
        "AI engineer",
        "password123",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message:
          "User registered successfully. Please check your email for verification.",
      });
    });

    it("should handle registration errors", async () => {
      mockRequest.body = {
        email: "test@example.com",
        name: "Test User",
        category: "AI engineer",
        password: "password123",
      };
      mockAuthUseCase.register.mockRejectedValue(
        new Error("Registration failed"),
      );

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Registration failed",
      });
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully and set tokens", async () => {
      mockRequest.query = { token: "valid-token" };
      mockAuthUseCase.verifyEmail.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.verifyEmail).toHaveBeenCalledWith("valid-token");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CONFIG.ACCESS_TOKEN_COOKIE_NAME,
        "access-token",
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CONFIG.REFRESH_TOKEN_COOKIE_NAME,
        "refresh-token",
        expect.any(Object),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${CONFIG.FRONT_URL}/terms-of-use`,
      );
    });

    it("should handle invalid token", async () => {
      mockRequest.query = {};

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid token",
      });
    });

    it("should handle verification errors", async () => {
      mockRequest.query = { token: "invalid-token" };
      mockAuthUseCase.verifyEmail.mockRejectedValue(
        new Error("Verification failed"),
      );

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Verification failed",
      });
    });
  });

  describe("login", () => {
    it("should login successfully and set tokens", async () => {
      mockRequest.body = { email: "test@example.com", password: "password123" };
      mockAuthUseCase.login.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.login).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CONFIG.ACCESS_TOKEN_COOKIE_NAME,
        "access-token",
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CONFIG.REFRESH_TOKEN_COOKIE_NAME,
        "refresh-token",
        expect.any(Object),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Login successful",
      });
    });

    it("should handle login errors", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrong-password",
      };
      mockAuthUseCase.login.mockRejectedValue(new Error("Invalid credentials"));

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token successfully", async () => {
      mockRequest.cookies = {
        [CONFIG.REFRESH_TOKEN_COOKIE_NAME]: "valid-token",
      };
      mockAuthUseCase.refreshAccessToken.mockResolvedValue("new-access-token");

      await authController.refreshAccessToken(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.refreshAccessToken).toHaveBeenCalledWith(
        "valid-token",
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        CONFIG.ACCESS_TOKEN_COOKIE_NAME,
        "new-access-token",
        expect.any(Object),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Token refreshed successfully",
      });
    });

    it("should handle missing refresh token", async () => {
      mockRequest.cookies = {};

      await authController.refreshAccessToken(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No refresh token provided",
      });
    });

    it("should handle token refresh errors", async () => {
      mockRequest.cookies = {
        [CONFIG.REFRESH_TOKEN_COOKIE_NAME]: "invalid-token",
      };
      mockAuthUseCase.refreshAccessToken.mockRejectedValue(
        new Error("Invalid refresh token"),
      );

      await authController.refreshAccessToken(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid refresh token",
      });
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        currentPassword: "oldpass",
        newPassword: "newpass",
      };

      await authController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.changePassword).toHaveBeenCalledWith(
        "test@example.com",
        "oldpass",
        "newpass",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Password changed successfully",
      });
    });

    it("should handle change password errors", async () => {
      mockRequest.body = {
        email: "test@example.com",
        currentPassword: "wrongpass",
        newPassword: "newpass",
      };
      mockAuthUseCase.changePassword.mockRejectedValue(
        new Error("Current password is incorrect"),
      );

      await authController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Current password is incorrect",
      });
    });
  });

  describe("forgotPassword", () => {
    it("should initiate forgot password process successfully", async () => {
      mockRequest.body = { email: "test@example.com" };

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.forgotPassword).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Password reset email sent. Please check your inbox.",
      });
    });

    it("should handle forgot password errors", async () => {
      mockRequest.body = { email: "nonexistent@example.com" };
      mockAuthUseCase.forgotPassword.mockRejectedValue(
        new Error("User not found"),
      );

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      mockRequest.params = { token: "valid-reset-token" };
      mockRequest.body = { newPassword: "newpassword123" };

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuthUseCase.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "newpassword123",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    });

    it("should handle reset password errors", async () => {
      mockRequest.params = { token: "invalid-reset-token" };
      mockRequest.body = { newPassword: "newpassword123" };
      mockAuthUseCase.resetPassword.mockRejectedValue(
        new Error("Invalid or expired reset token"),
      );

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid or expired reset token",
      });
    });
  });

  describe("logout", () => {
    it("should logout successfully by clearing cookies", async () => {
        mockRequest.cookies = {
            [CONFIG.REFRESH_TOKEN_COOKIE_NAME]: "valid-refresh-token",
        };

        await authController.logout(
            mockRequest as Request,
            mockResponse as Response,
        );
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(CONFIG.ACCESS_TOKEN_COOKIE_NAME);
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(CONFIG.REFRESH_TOKEN_COOKIE_NAME);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: "Logged out successfully",
        });
    });

    it("should handle missing refresh token", async () => {
        mockRequest.cookies = {};

        await authController.logout(
            mockRequest as Request,
            mockResponse as Response,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: "No refresh token provided",
        });
    });

    it("should handle logout errors", async () => {
        mockRequest.cookies = {
            [CONFIG.REFRESH_TOKEN_COOKIE_NAME]: "invalid-refresh-token",
        };

        await authController.logout(
            mockRequest as Request,
            mockResponse as Response,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: "Logout failed",
        });
    });
});

});
