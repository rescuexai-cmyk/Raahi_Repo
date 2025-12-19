import request from 'supertest';
import { app } from '../index';
import { prisma } from '@/database/connection';

describe('Pricing API', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  describe('POST /api/pricing/calculate', () => {
    it('should calculate fare for a valid ride request', async () => {
      const rideRequest = {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910,
        vehicleType: 'sedan'
      };

      const response = await request(app)
        .post('/api/pricing/calculate')
        .send(rideRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFare');
      expect(response.body.data).toHaveProperty('distance');
      expect(response.body.data).toHaveProperty('estimatedDuration');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(response.body.data.totalFare).toBeGreaterThan(0);
    });

    it('should return error for invalid coordinates', async () => {
      const invalidRequest = {
        pickupLat: 200, // Invalid latitude
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910
      };

      const response = await request(app)
        .post('/api/pricing/calculate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should calculate different fares for different distances', async () => {
      const shortRide = {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        dropLat: 28.6140,
        dropLng: 77.2091
      };

      const longRide = {
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        dropLat: 28.5355,
        dropLng: 77.3910
      };

      const [shortResponse, longResponse] = await Promise.all([
        request(app).post('/api/pricing/calculate').send(shortRide),
        request(app).post('/api/pricing/calculate').send(longRide)
      ]);

      expect(shortResponse.body.success).toBe(true);
      expect(longResponse.body.success).toBe(true);
      expect(longResponse.body.data.totalFare).toBeGreaterThan(shortResponse.body.data.totalFare);
    });
  });

  describe('GET /api/pricing/nearby-drivers', () => {
    it('should return nearby drivers for a location', async () => {
      const location = {
        lat: 28.6139,
        lng: 77.2090,
        radius: 5
      };

      const response = await request(app)
        .get('/api/pricing/nearby-drivers')
        .query(location)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('drivers');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.drivers)).toBe(true);
    });
  });

  describe('GET /api/pricing/surge-areas', () => {
    it('should return surge areas', async () => {
      const response = await request(app)
        .get('/api/pricing/surge-areas')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('surgeAreas');
      expect(Array.isArray(response.body.data.surgeAreas)).toBe(true);
    });
  });

  describe('GET /api/pricing/rules', () => {
    it('should return current pricing rules', async () => {
      const response = await request(app)
        .get('/api/pricing/rules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('baseFare');
      expect(response.body.data).toHaveProperty('perKmRate');
      expect(response.body.data).toHaveProperty('perMinuteRate');
    });
  });
});
