import { AuthUseCase } from "../../../src/application/use-cases/auth/AuthUseCase";
import { IUserRepository } from "../../../src/domain/repo/IUserRepository";
import { IEmailService } from "../../../src/domain/services/IEmailService";
import { IEncryptionService } from "../../../src/domain/services/IEncryptionService";
import { IRandomStringGenerator } from "../../../src/domain/services/IRandomStrGeneratorService";
import { ITokenService } from "../../../src/domain/services/ITokenService";
import { CONFIG } from "../../../src/main/config/config";

describe("AuthUseCase", () => {
  let authUseCase: AuthUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockEmailService: jest.Mocked<IEmailService>;
  let mockEncryptionService: jest.Mocked<IEncryptionService>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockRandomStringGenerator: jest.Mocked<IRandomStringGenerator>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByVerificationToken: jest.fn(),
    } as any;
    mockEmailService = { sendEmail: jest.fn() } as any;
    mockEncryptionService = { hash: jest.fn(), compare: jest.fn() } as any;
    mockTokenService = {
      generate: jest.fn(),
      verify: jest.fn(),
    } as any;
    mockRandomStringGenerator = { generate: jest.fn() } as any;

    authUseCase = new AuthUseCase(
      mockUserRepository,
      mockEmailService,
      mockEncryptionService,
      mockTokenService,
      mockRandomStringGenerator,
    );
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockEncryptionService.hash.mockResolvedValue("hashed_password");
      mockRandomStringGenerator.generate.mockReturnValue("verification_token");

      await authUseCase.register(
        "test@example.com",
        "Test User",
        "AI engineer",
        "password123"
      );

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
          category: "AI engineer",
          password: "hashed_password",
          isEmailVerified: false,
          verificationToken: "verification_token",
        })
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should throw an error if the user already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "test@example.com",
      } as any);

      await expect(
        authUseCase.register(
          "test@example.com",
          "Test User",
          "AI engineer",
          "password123"
        )
      ).rejects.toThrow("User already exists");
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        isEmailVerified: false,
        verificationToken: "valid_token",
      };
      mockUserRepository.findByVerificationToken.mockResolvedValue(
        mockUser as any
      );

      await authUseCase.verifyEmail("valid_token");

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          isEmailVerified: true,
          verificationToken: null,
        })
      );
    });

    it("should throw an error for invalid token", async () => {
      mockUserRepository.findByVerificationToken.mockResolvedValue(null);

      await expect(authUseCase.verifyEmail("invalid_token")).rejects.toThrow(
        "Invalid or expired token"
      );
    });
  });

  describe("login", () => {
    it("should login successfully and generate both access and refresh tokens", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        password: "hashed_password",
        isEmailVerified: true,
      };
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(true);
      
      // Mock the token generation responses
      mockTokenService.generate
        .mockResolvedValueOnce("access_token")  // First call: for access token
        .mockResolvedValueOnce("refresh_token");  // Second call: for refresh token
  
      const result = await authUseCase.login("test@example.com", "password123");
  
      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
  
      // Verify first call (access token generation)
      expect(mockTokenService.generate).toHaveBeenNthCalledWith(
        1,
        { userId: "1" },  // Payload
        CONFIG.JWT_SECRET,  // Secret
        CONFIG.JWT_EXPIRATION  // Expiration time
      );
  
      // Verify second call (refresh token generation)
      expect(mockTokenService.generate).toHaveBeenNthCalledWith(
        2,
        { userId: "1" },  // Payload
        CONFIG.REFRESH_TOKEN_SECRET,  // Secret
        CONFIG.REFRESH_TOKEN_EXPIRATION  // Expiration time
      );
    });

    it("should throw an error for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authUseCase.login("nonexistent@example.com", "password123")
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw an error for unverified email", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        password: "hashed_password",
        isEmailVerified: false,
      };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        authUseCase.login("test@example.com", "password123")
      ).rejects.toThrow("Please verify your email before logging in");
    });

    it("should throw an error for invalid password", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        password: "hashed_password",
        isEmailVerified: true,
      };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(false);

      await expect(
        authUseCase.login("test@example.com", "wrong_password")
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        password: "old_hashed_password",
      };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(true);
      mockEncryptionService.hash.mockResolvedValue("new_hashed_password");

      await authUseCase.changePassword(
        "test@example.com",
        "old_password",
        "new_password"
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          password: "new_hashed_password",
        })
      );
    });

    it("should throw an error for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authUseCase.changePassword(
          "nonexistent@example.com",
          "old_password",
          "new_password"
        )
      ).rejects.toThrow("User not found");
    });

    it("should throw an error for incorrect current password", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        password: "old_hashed_password",
      };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(false);

      await expect(
        authUseCase.changePassword(
          "test@example.com",
          "wrong_password",
          "new_password"
        )
      ).rejects.toThrow("Current password is incorrect");
    });
  });

  describe("forgotPassword", () => {
    it("should initiate forgot password process successfully", async () => {
      const mockUser = { id: "1", email: "test@example.com" };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockRandomStringGenerator.generate.mockReturnValue("reset_token");

      await authUseCase.forgotPassword("test@example.com");

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          verificationToken: "reset_token",
        })
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should throw an error for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authUseCase.forgotPassword("nonexistent@example.com")
      ).rejects.toThrow("User not found");
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        verificationToken: "valid_token",
      };
      mockUserRepository.findByVerificationToken.mockResolvedValue(
        mockUser as any
      );
      mockEncryptionService.hash.mockResolvedValue("new_hashed_password");

      await authUseCase.resetPassword("valid_token", "new_password");

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          password: "new_hashed_password",
          verificationToken: null,
        })
      );
    });

    it("should throw an error for invalid token", async () => {
      mockUserRepository.findByVerificationToken.mockResolvedValue(null);

      await expect(
        authUseCase.resetPassword("invalid_token", "new_password")
      ).rejects.toThrow("Invalid or expired token");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token successfully", async () => {
      mockTokenService.verify.mockResolvedValue({ userId: "1" });
      mockTokenService.generate.mockResolvedValue("new_access_token");

      const result = await authUseCase.refreshAccessToken("valid_refresh_token");

      expect(result).toBe("new_access_token");
      expect(mockTokenService.generate).toHaveBeenCalledWith(
        { userId: "1" },
        CONFIG.JWT_SECRET,
        CONFIG.JWT_EXPIRATION
      );
    });

    it("should throw an error for invalid refresh token", async () => {
      mockTokenService.verify.mockResolvedValue(null);

      await expect(
        authUseCase.refreshAccessToken("invalid_refresh_token")
      ).rejects.toThrow("Invalid refresh token");
    });
  });
});
