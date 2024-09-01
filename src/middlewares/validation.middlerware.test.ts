import { Request, Response } from 'express';
import * as validationMiddleware from './validationMiddleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  const runMiddleware = async (middlewares: any[]) => {
    for (const middleware of middlewares) {
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    }
  };

  describe('validateRegisterInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'ValidPass1',
      };

      await runMiddleware(validationMiddleware.validateRegisterInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'ValidPass1',
      };

      await runMiddleware(validationMiddleware.validateRegisterInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid email address'
          })
        ])
      }));
    });

    it('should fail for missing name', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'ValidPass1',
      };

      await runMiddleware(validationMiddleware.validateRegisterInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Name is required'
          })
        ])
      }));
    });

    it('should fail for invalid password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'weak',
      };

      await runMiddleware(validationMiddleware.validateRegisterInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringMatching(/Password must be/)
          })
        ])
      }));
    });
  });

  describe('validateLoginInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'ValidPass1',
      };

      await runMiddleware(validationMiddleware.validateLoginInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'ValidPass1',
      };

      await runMiddleware(validationMiddleware.validateLoginInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid email address'
          })
        ])
      }));
    });

    it('should fail for missing password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      await runMiddleware(validationMiddleware.validateLoginInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Password is required'
          })
        ])
      }));
    });
  });

  describe('validateChangePasswordInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      };

      await runMiddleware(validationMiddleware.validateChangePasswordInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      };

      await runMiddleware(validationMiddleware.validateChangePasswordInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid email address'
          })
        ])
      }));
    });

    it('should fail for missing current password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        newPassword: 'NewPass1',
      };

      await runMiddleware(validationMiddleware.validateChangePasswordInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Current password is required'
          })
        ])
      }));
    });

    it('should fail for invalid new password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        currentPassword: 'OldPass1',
        newPassword: 'weak',
      };

      await runMiddleware(validationMiddleware.validateChangePasswordInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringMatching(/New password must be/)
          })
        ])
      }));
    });
  });

  describe('validateForgotPasswordInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      await runMiddleware(validationMiddleware.validateForgotPasswordInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
      };

      await runMiddleware(validationMiddleware.validateForgotPasswordInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid email address'
          })
        ])
      }));
    });
  });

  describe('validateResetPasswordInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.body = {
        newPassword: 'NewValidPass1',
      };

      await runMiddleware(validationMiddleware.validateResetPasswordInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for invalid new password', async () => {
      mockRequest.body = {
        newPassword: 'weak',
      };

      await runMiddleware(validationMiddleware.validateResetPasswordInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringMatching(/New password must be/)
          })
        ])
      }));
    });
  });

  describe('validateVerifyEmailInput', () => {
    it('should pass for valid input', async () => {
      mockRequest.query = {
        token: 'valid-token',
      };

      await runMiddleware(validationMiddleware.validateVerifyEmailInput);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail for missing token', async () => {
      mockRequest.query = {};

      await runMiddleware(validationMiddleware.validateVerifyEmailInput);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Token is required'
          })
        ])
      }));
    });
  });
});