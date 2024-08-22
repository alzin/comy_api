
import request from 'supertest';
import express, { Application } from 'express';
import authRouter, { users } from './auth';
import bcrypt from "bcryptjs";

jest.mock('nodemailer');
const nodemailer = require('nodemailer');
nodemailer.createTransport.mockReturnValue({
  sendMail: jest.fn().mockResolvedValue(true),
});

const app: Application = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Router', () => {

  beforeEach(() => {
    const hashedPassword = bcrypt.hashSync('password123', 10); 
    users.length = 0; // Clear users array before each test
    users.push({
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
      isVerified: true,
      verificationToken: 'validtoken',
    });    
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/users', () => {
    it('should return a list of users', async () => {
      const res = await request(app).get('/auth/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe('test@example.com');
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe(
        'User registered successfully. Please verify your email.'
      );
      expect(users).toHaveLength(2);
    });

    it('should return 400 if user already exists', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in an existing user', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 400 for invalid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/verify-email', () => {
    it('should verify the user email with a valid token', async () => {
      const token = users[0].verificationToken;
      const res = await request(app).get(`/auth/verify-email`).query({ token });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(
        'Email verified successfully. You can now log in.'
      );
      expect(users[0].isVerified).toBe(true);
    });

    it('should return 400 for missing token', async () => {
      const res = await request(app).get('/auth/verify-email').query({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or missing token');
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app).get('/auth/verify-email').query({ token: 'invalidtoken' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change the password with valid inputs', async () => {
      const res = await request(app)
        .post('/auth/change-password')
        .send({
          email: 'test@example.com',
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated successfully');
    });

    it('should return 400 for incorrect current password', async () => {
      const res = await request(app)
        .post('/auth/change-password')
        .send({
          email: 'test@example.com',
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('should return 400 for invalid input data', async () => {
      const res = await request(app)
        .post('/auth/change-password')
        .send({
          email: 'test@example.com',
          currentPassword: '',
          newPassword: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid input');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send a password reset email with valid email', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset email sent. Please check your inbox.');
    });

    it('should return 400 for non-existent email', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 400 for invalid input data', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Please provide a valid email');
    });
  });

  describe('POST /auth/reset-password/:token', () => {
    it('should reset the password with a valid token', async () => {
      const token = users[0].verificationToken;
      const res = await request(app)
        .post(`/auth/reset-password/${token}`)
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password has been reset successfully. You can now log in with your new password.');
      expect(users[0].password).not.toBe('$2a$10$hashhashhashhash');
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app)
        .post('/auth/reset-password/invalidtoken')
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('should return 400 for missing newPassword', async () => {
      const token = users[0].verificationToken;
      const res = await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid input');
    });
  });
});
