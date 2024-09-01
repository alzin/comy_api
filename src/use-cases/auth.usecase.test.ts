import { AuthUseCase } from './AuthUseCase';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IEmailService } from '../interfaces/IEmailService';
import { IEncryptionService } from '../interfaces/IEncryptionService';
import { ITokenService } from '../interfaces/ITokenService';
import { IRandomStringGenerator } from '../interfaces/IRandomStringGenerator';

describe('AuthUseCase', () => {
  let authUseCase: AuthUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockEmailService: jest.Mocked<IEmailService>;
  let mockEncryptionService: jest.Mocked<IEncryptionService>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockRandomStringGenerator: jest.Mocked<IRandomStringGenerator>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findByVerificationToken: jest.fn(),
    } as any;
    mockEmailService = { sendEmail: jest.fn() } as any;
    mockEncryptionService = { hash: jest.fn(), compare: jest.fn() } as any;
    mockTokenService = { generate: jest.fn() } as any;
    mockRandomStringGenerator = { generate: jest.fn() } as any;

    authUseCase = new AuthUseCase(
      mockUserRepository,
      mockEmailService,
      mockEncryptionService,
      mockTokenService,
      mockRandomStringGenerator
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockEncryptionService.hash.mockResolvedValue('hashed_password');
      mockRandomStringGenerator.generate.mockReturnValue('verification_token');

      await authUseCase.register('test@example.com', 'Test User', 'password123');

      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        isVerified: false,
        verificationToken: 'verification_token'
      }));
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should throw an error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@example.com' } as any);

      await expect(authUseCase.register('test@example.com', 'Test User', 'password123'))
        .rejects.toThrow('User already exists');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', isVerified: false, verificationToken: 'valid_token' };
      mockUserRepository.findByVerificationToken.mockResolvedValue(mockUser as any);

      await authUseCase.verifyEmail('valid_token');

      expect(mockUserRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        isVerified: true,
        verificationToken: null
      }));
    });

    it('should throw an error for invalid token', async () => {
      mockUserRepository.findByVerificationToken.mockResolvedValue(null);

      await expect(authUseCase.verifyEmail('invalid_token'))
        .rejects.toThrow('Invalid or expired token');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed_password', isVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(true);
      mockTokenService.generate.mockResolvedValue('jwt_token');

      const result = await authUseCase.login('test@example.com', 'password123');

      expect(result).toBe('jwt_token');
      expect(mockTokenService.generate).toHaveBeenCalledWith({ id: '1', email: 'test@example.com' });
    });

    it('should throw an error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authUseCase.login('nonexistent@example.com', 'password123'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw an error for unverified user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed_password', isVerified: false };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(authUseCase.login('test@example.com', 'password123'))
        .rejects.toThrow('Please verify your email before logging in');
    });

    it('should throw an error for invalid password', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed_password', isVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(false);

      await expect(authUseCase.login('test@example.com', 'wrong_password'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'old_hashed_password' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(true);
      mockEncryptionService.hash.mockResolvedValue('new_hashed_password');

      await authUseCase.changePassword('test@example.com', 'old_password', 'new_password');

      expect(mockUserRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        password: 'new_hashed_password'
      }));
    });

    it('should throw an error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authUseCase.changePassword('nonexistent@example.com', 'old_password', 'new_password'))
        .rejects.toThrow('User not found');
    });

    it('should throw an error for incorrect current password', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'old_hashed_password' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockEncryptionService.compare.mockResolvedValue(false);

      await expect(authUseCase.changePassword('test@example.com', 'wrong_password', 'new_password'))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('forgotPassword', () => {
    it('should initiate forgot password process successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockRandomStringGenerator.generate.mockReturnValue('reset_token');

      await authUseCase.forgotPassword('test@example.com');

      expect(mockUserRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        verificationToken: 'reset_token'
      }));
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should throw an error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authUseCase.forgotPassword('nonexistent@example.com'))
        .rejects.toThrow('User not found');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', verificationToken: 'valid_token' };
      mockUserRepository.findByVerificationToken.mockResolvedValue(mockUser as any);
      mockEncryptionService.hash.mockResolvedValue('new_hashed_password');

      await authUseCase.resetPassword('valid_token', 'new_password');

      expect(mockUserRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        password: 'new_hashed_password',
        verificationToken: null
      }));
    });

    it('should throw an error for invalid token', async () => {
      mockUserRepository.findByVerificationToken.mockResolvedValue(null);

      await expect(authUseCase.resetPassword('invalid_token', 'new_password'))
        .rejects.toThrow('Invalid or expired token');
    });
  });
});