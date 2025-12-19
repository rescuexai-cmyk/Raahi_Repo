import request from 'supertest';
import { app } from '../index';
import { prisma } from '@/database/connection';

describe('Authentication API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/send-otp', () => {
    it('should send OTP for valid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '9876543210',
          countryCode: '+91'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should return error for invalid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: 'invalid-phone'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP and return tokens', async () => {
      // First send OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '9876543210',
          countryCode: '+91'
        });

      // In development mode, OTP is logged, so we can use a test OTP
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '123456',
          countryCode: '+91'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return error for invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '000000',
          countryCode: '+91'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/google', () => {
    it('should authenticate with valid Google token', async () => {
      // Mock Google token verification
      const mockGoogleToken = 'mock-google-token';
      
      const response = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: mockGoogleToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First get tokens
      await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '9876543210',
          countryCode: '+91'
        });

      const authResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '123456',
          countryCode: '+91'
        });

      const refreshToken = authResponse.body.data.tokens.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Get access token
      await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '9876543210',
          countryCode: '+91'
        });

      const authResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '123456',
          countryCode: '+91'
        });

      accessToken = authResponse.body.data.tokens.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('phone');
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });
});

