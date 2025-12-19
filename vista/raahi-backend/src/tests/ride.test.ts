import request from 'supertest';
import { app } from '../index';
import { prisma } from '@/database/connection';

describe('Ride API', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.ride.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and get token
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
    userId = authResponse.body.data.user.id;
  });

  describe('POST /api/rides', () => {
    it('should create a new ride with valid data', async () => {
      const rideData = {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910,
        pickupAddress: 'Connaught Place, New Delhi',
        dropAddress: 'India Gate, New Delhi',
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(rideData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('totalFare');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should return error for invalid coordinates', async () => {
      const invalidRideData = {
        pickupLat: 200, // Invalid latitude
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910,
        pickupAddress: 'Connaught Place, New Delhi',
        dropAddress: 'India Gate, New Delhi',
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRideData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return error without authentication', async () => {
      const rideData = {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910,
        pickupAddress: 'Connaught Place, New Delhi',
        dropAddress: 'India Gate, New Delhi',
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/rides')
        .send(rideData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /api/rides', () => {
    beforeEach(async () => {
      // Create test rides
      await prisma.ride.createMany([
        {
          passengerId: userId,
          pickupLatitude: 28.6139,
          pickupLongitude: 77.2090,
          dropLatitude: 28.5355,
          dropLongitude: 77.3910,
          pickupAddress: 'Connaught Place, New Delhi',
          dropAddress: 'India Gate, New Delhi',
          distance: 10.5,
          duration: 25,
          baseFare: 25,
          distanceFare: 126,
          timeFare: 50,
          surgeMultiplier: 1.0,
          totalFare: 201,
          paymentMethod: 'CASH',
          status: 'COMPLETED'
        },
        {
          passengerId: userId,
          pickupLatitude: 28.5355,
          pickupLongitude: 77.3910,
          dropLatitude: 28.6139,
          dropLongitude: 77.2090,
          pickupAddress: 'India Gate, New Delhi',
          dropAddress: 'Connaught Place, New Delhi',
          distance: 10.5,
          duration: 25,
          baseFare: 25,
          distanceFare: 126,
          timeFare: 50,
          surgeMultiplier: 1.0,
          totalFare: 201,
          paymentMethod: 'CARD',
          status: 'PENDING'
        }
      ]);
    });

    it('should return user rides with pagination', async () => {
      const response = await request(app)
        .get('/api/rides')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rides');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('totalPages');
      expect(response.body.data.rides).toHaveLength(2);
    });

    it('should return rides with pagination parameters', async () => {
      const response = await request(app)
        .get('/api/rides?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rides).toHaveLength(1);
      expect(response.body.data.page).toBe(1);
    });
  });

  describe('GET /api/rides/:id', () => {
    let rideId: string;

    beforeEach(async () => {
      const ride = await prisma.ride.create({
        data: {
          passengerId: userId,
          pickupLatitude: 28.6139,
          pickupLongitude: 77.2090,
          dropLatitude: 28.5355,
          dropLongitude: 77.3910,
          pickupAddress: 'Connaught Place, New Delhi',
          dropAddress: 'India Gate, New Delhi',
          distance: 10.5,
          duration: 25,
          baseFare: 25,
          distanceFare: 126,
          timeFare: 50,
          surgeMultiplier: 1.0,
          totalFare: 201,
          paymentMethod: 'CASH',
          status: 'PENDING'
        }
      });
      rideId = ride.id;
    });

    it('should return ride by ID', async () => {
      const response = await request(app)
        .get(`/api/rides/${rideId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(rideId);
      expect(response.body.data.passengerId).toBe(userId);
    });

    it('should return 404 for non-existent ride', async () => {
      const response = await request(app)
        .get('/api/rides/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ride not found');
    });
  });

  describe('POST /api/rides/:id/cancel', () => {
    let rideId: string;

    beforeEach(async () => {
      const ride = await prisma.ride.create({
        data: {
          passengerId: userId,
          pickupLatitude: 28.6139,
          pickupLongitude: 77.2090,
          dropLatitude: 28.5355,
          dropLongitude: 77.3910,
          pickupAddress: 'Connaught Place, New Delhi',
          dropAddress: 'India Gate, New Delhi',
          distance: 10.5,
          duration: 25,
          baseFare: 25,
          distanceFare: 126,
          timeFare: 50,
          surgeMultiplier: 1.0,
          totalFare: 201,
          paymentMethod: 'CASH',
          status: 'PENDING'
        }
      });
      rideId = ride.id;
    });

    it('should cancel ride successfully', async () => {
      const response = await request(app)
        .post(`/api/rides/${rideId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Change of plans'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
    });
  });
});

