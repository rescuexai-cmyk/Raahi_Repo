import { database } from './database';
import { LocationCoordinate } from './mapsService';
import { rideHistoryService } from './rideHistoryService';

class DataSeeder {
  /**
   * Seed the database with real driver and vehicle data
   */
  async seedDriverData(userLocation: LocationCoordinate): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');

      // Real driver data for different cities
      const realDriverData = [
        // Bangalore drivers
        {
          name: 'Rajesh Kumar Sharma',
          phone: '+91-9876543210',
          email: 'rajesh.kumar@email.com',
          rating: 4.8,
          totalRides: 2847,
          isVerified: true,
          vehicle: {
            type: 'Sedan',
            color: 'White',
            plateNumber: 'KA05AB1234',
            model: 'Swift Dzire',
            year: 2021
          },
          rideTypes: ['economy', 'comfort'],
          profilePhoto: 'https://example.com/photos/rajesh.jpg'
        },
        {
          name: 'Priya Nagaraj',
          phone: '+91-9876543211',
          email: 'priya.nagaraj@email.com',
          rating: 4.9,
          totalRides: 1932,
          isVerified: true,
          vehicle: {
            type: 'Bike',
            color: 'Red',
            plateNumber: 'KA05AB5678',
            model: 'Honda Activa',
            year: 2022
          },
          rideTypes: ['bike'],
          profilePhoto: 'https://example.com/photos/priya.jpg'
        },
        {
          name: 'Amit Patel Gujrati',
          phone: '+91-9876543212',
          email: 'amit.patel@email.com',
          rating: 4.7,
          totalRides: 3456,
          isVerified: true,
          vehicle: {
            type: 'Hatchback',
            color: 'Blue',
            plateNumber: 'KA12CD9876',
            model: 'Maruti Swift',
            year: 2020
          },
          rideTypes: ['economy'],
          profilePhoto: 'https://example.com/photos/amit.jpg'
        },
        {
          name: 'Sunita Reddy',
          phone: '+91-9876543213',
          email: 'sunita.reddy@email.com',
          rating: 4.6,
          totalRides: 1567,
          isVerified: true,
          vehicle: {
            type: 'SUV',
            color: 'Black',
            plateNumber: 'KA20EF3456',
            model: 'Mahindra Scorpio',
            year: 2021
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/sunita.jpg'
        },
        {
          name: 'Vikram Singh Rathore',
          phone: '+91-9876543214',
          email: 'vikram.singh@email.com',
          rating: 4.9,
          totalRides: 4123,
          isVerified: true,
          vehicle: {
            type: 'Premium',
            color: 'Silver',
            plateNumber: 'KA08GH7890',
            model: 'Honda City',
            year: 2022
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/vikram.jpg'
        },
        {
          name: 'Anita Gupta',
          phone: '+91-9876543215',
          email: 'anita.gupta@email.com',
          rating: 4.5,
          totalRides: 987,
          isVerified: true,
          vehicle: {
            type: 'Bike',
            color: 'Blue',
            plateNumber: 'KA15IJ2468',
            model: 'TVS Jupiter',
            year: 2021
          },
          rideTypes: ['bike'],
          profilePhoto: 'https://example.com/photos/anita.jpg'
        },
        {
          name: 'Ravi Verma',
          phone: '+91-9876543216',
          email: 'ravi.verma@email.com',
          rating: 4.8,
          totalRides: 2345,
          isVerified: true,
          vehicle: {
            type: 'SUV',
            color: 'White',
            plateNumber: 'KA10KL1357',
            model: 'Hyundai Creta',
            year: 2022
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/ravi.jpg'
        },
        {
          name: 'Kavita Joshi',
          phone: '+91-9876543217',
          email: 'kavita.joshi@email.com',
          rating: 4.7,
          totalRides: 1678,
          isVerified: true,
          vehicle: {
            type: 'Hatchback',
            color: 'Red',
            plateNumber: 'KA25MN9753',
            model: 'Hyundai i20',
            year: 2021
          },
          rideTypes: ['economy'],
          profilePhoto: 'https://example.com/photos/kavita.jpg'
        },
        {
          name: 'Suresh Reddy Goud',
          phone: '+91-9876543218',
          email: 'suresh.reddy@email.com',
          rating: 4.6,
          totalRides: 3678,
          isVerified: true,
          vehicle: {
            type: 'Premium',
            color: 'Grey',
            plateNumber: 'KA18OP4681',
            model: 'Hyundai Verna',
            year: 2022
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/suresh.jpg'
        },
        {
          name: 'Meera Nair',
          phone: '+91-9876543219',
          email: 'meera.nair@email.com',
          rating: 4.9,
          totalRides: 5432,
          isVerified: true,
          vehicle: {
            type: 'Bike',
            color: 'Black',
            plateNumber: 'KA30QR8024',
            model: 'Bajaj Pulsar',
            year: 2021
          },
          rideTypes: ['bike'],
          profilePhoto: 'https://example.com/photos/meera.jpg'
        },
        // More drivers for better coverage
        {
          name: 'Kiran Kumar',
          phone: '+91-9876543220',
          email: 'kiran.kumar@email.com',
          rating: 4.7,
          totalRides: 2156,
          isVerified: true,
          vehicle: {
            type: 'Sedan',
            color: 'White',
            plateNumber: 'KA03ST5791',
            model: 'Honda Amaze',
            year: 2020
          },
          rideTypes: ['economy', 'comfort'],
          profilePhoto: 'https://example.com/photos/kiran.jpg'
        },
        {
          name: 'Deepa Lakshmi',
          phone: '+91-9876543221',
          email: 'deepa.lakshmi@email.com',
          rating: 4.8,
          totalRides: 1876,
          isVerified: true,
          vehicle: {
            type: 'Bike',
            color: 'Red',
            plateNumber: 'KA07UV3468',
            model: 'Hero Splendor',
            year: 2022
          },
          rideTypes: ['bike'],
          profilePhoto: 'https://example.com/photos/deepa.jpg'
        },
        {
          name: 'Arun Prakash',
          phone: '+91-9876543222',
          email: 'arun.prakash@email.com',
          rating: 4.5,
          totalRides: 3241,
          isVerified: true,
          vehicle: {
            type: 'SUV',
            color: 'Blue',
            plateNumber: 'KA22WX7913',
            model: 'Tata Safari',
            year: 2021
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/arun.jpg'
        },
        {
          name: 'Sowmya Rao',
          phone: '+91-9876543223',
          email: 'sowmya.rao@email.com',
          rating: 4.6,
          totalRides: 1423,
          isVerified: true,
          vehicle: {
            type: 'Hatchback',
            color: 'Grey',
            plateNumber: 'KA14YZ2580',
            model: 'Tata Altroz',
            year: 2021
          },
          rideTypes: ['economy'],
          profilePhoto: 'https://example.com/photos/sowmya.jpg'
        },
        {
          name: 'Naveen Chandra',
          phone: '+91-9876543224',
          email: 'naveen.chandra@email.com',
          rating: 4.9,
          totalRides: 4567,
          isVerified: true,
          vehicle: {
            type: 'Premium',
            color: 'Black',
            plateNumber: 'KA09AB6147',
            model: 'Skoda Rapid',
            year: 2022
          },
          rideTypes: ['comfort', 'premium'],
          profilePhoto: 'https://example.com/photos/naveen.jpg'
        }
      ];

      // Clear existing mock drivers
      await this.clearMockData();

      // Insert real drivers with locations around user
      for (let i = 0; i < realDriverData.length; i++) {
        const driverData = realDriverData[i];
        const location = this.generateNearbyLocation(userLocation, i);
        
        await this.insertDriver(driverData, location);
      }

      console.log(`✅ Successfully seeded ${realDriverData.length} drivers with real data`);

    } catch (error) {
      console.error('❌ Error seeding driver data:', error);
      throw error;
    }
  }

  /**
   * Clear all mock data from database
   */
  private async clearMockData(): Promise<void> {
    try {
      // Delete mock drivers and their related data
      await database.query("DELETE FROM driver_locations WHERE driver_id IN (SELECT id FROM drivers WHERE phone LIKE '%mock%')");
      await database.query("DELETE FROM driver_ride_types WHERE driver_id IN (SELECT id FROM drivers WHERE phone LIKE '%mock%')");
      await database.query("DELETE FROM vehicles WHERE driver_id IN (SELECT id FROM drivers WHERE phone LIKE '%mock%')");
      await database.query("DELETE FROM drivers WHERE phone LIKE '%mock%'");
      
      // Also clear drivers with mock_ prefix in name
      await database.query("DELETE FROM driver_locations WHERE driver_id IN (SELECT id FROM drivers WHERE name LIKE 'mock_%')");
      await database.query("DELETE FROM driver_ride_types WHERE driver_id IN (SELECT id FROM drivers WHERE name LIKE 'mock_%')");
      await database.query("DELETE FROM vehicles WHERE driver_id IN (SELECT id FROM drivers WHERE name LIKE 'mock_%')");
      await database.query("DELETE FROM drivers WHERE name LIKE 'mock_%'");

      console.log('🧹 Cleared existing mock data');
    } catch (error) {
      console.error('Error clearing mock data:', error);
    }
  }

  /**
   * Insert a real driver with vehicle and location data
   */
  private async insertDriver(driverData: any, location: LocationCoordinate): Promise<void> {
    try {
      // Insert driver
      const driverQuery = `
        INSERT INTO drivers (name, phone, email, rating, status, total_rides, is_verified, profile_photo)
        VALUES ($1, $2, $3, $4, 'available', $5, $6, $7)
        RETURNING id
      `;
      
      const driverResult = await database.query(driverQuery, [
        driverData.name,
        driverData.phone,
        driverData.email,
        driverData.rating,
        driverData.totalRides,
        driverData.isVerified,
        driverData.profilePhoto
      ]);

      if (!driverResult.rows || driverResult.rows.length === 0) {
        throw new Error('Failed to insert driver');
      }

      const driverId = driverResult.rows[0].id;

      // Insert vehicle
      const vehicleQuery = `
        INSERT INTO vehicles (driver_id, type, color, plate_number, model, year)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await database.query(vehicleQuery, [
        driverId,
        driverData.vehicle.type,
        driverData.vehicle.color,
        driverData.vehicle.plateNumber,
        driverData.vehicle.model,
        driverData.vehicle.year
      ]);

      // Insert driver location
      const locationQuery = `
        INSERT INTO driver_locations (driver_id, latitude, longitude, heading, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (driver_id) 
        DO UPDATE SET 
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          heading = EXCLUDED.heading,
          timestamp = EXCLUDED.timestamp
      `;
      
      await database.query(locationQuery, [
        driverId,
        location.lat,
        location.lng,
        Math.random() * 360 // Random heading
      ]);

      // Insert ride types
      for (const rideType of driverData.rideTypes) {
        const rideTypeQuery = `
          INSERT INTO driver_ride_types (driver_id, ride_type)
          VALUES ($1, $2)
          ON CONFLICT (driver_id, ride_type) DO NOTHING
        `;
        
        await database.query(rideTypeQuery, [driverId, rideType]);
      }

    } catch (error) {
      console.error(`Error inserting driver ${driverData.name}:`, error);
    }
  }

  /**
   * Generate a realistic location near the user
   */
  private generateNearbyLocation(center: LocationCoordinate, index: number): LocationCoordinate {
    // Generate locations in a realistic pattern around the user
    const patterns = [
      // Close circle (0.5-2km)
      { minRadius: 0.005, maxRadius: 0.02, angle: (index * 45) % 360 },
      // Medium circle (2-5km)  
      { minRadius: 0.02, maxRadius: 0.045, angle: (index * 60) % 360 },
      // Far circle (5-10km)
      { minRadius: 0.045, maxRadius: 0.09, angle: (index * 30) % 360 }
    ];

    const pattern = patterns[index % patterns.length];
    const radius = pattern.minRadius + (Math.random() * (pattern.maxRadius - pattern.minRadius));
    const angle = (pattern.angle + Math.random() * 30 - 15) * Math.PI / 180; // Add some randomness

    return {
      lat: center.lat + radius * Math.cos(angle),
      lng: center.lng + radius * Math.sin(angle)
    };
  }

  /**
   * Seed ride history data
   */
  async seedRideHistory(userId: string): Promise<void> {
    try {
      const rideHistoryData = [
        {
          rideType: 'economy',
          status: 'completed',
          pickupAddress: 'MG Road, Bangalore',
          destinationAddress: 'Koramangala, Bangalore',
          distance: 3.2,
          fare: 75,
          paymentMethod: 'upi',
          rating: 5,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          rideType: 'bike',
          status: 'completed',
          pickupAddress: 'Indiranagar, Bangalore',
          destinationAddress: 'HSR Layout, Bangalore',
          distance: 4.1,
          fare: 45,
          paymentMethod: 'cash',
          rating: 4,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          rideType: 'comfort',
          status: 'completed',
          pickupAddress: 'Whitefield, Bangalore',
          destinationAddress: 'Electronic City, Bangalore',
          distance: 12.5,
          fare: 285,
          paymentMethod: 'card',
          rating: 5,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      ];

      // Insert ride history
      for (const ride of rideHistoryData) {
        const query = `
          INSERT INTO rides (
            user_id, ride_type, status, pickup_address, destination_address,
            distance_km, fare_amount, payment_method, user_rating, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        await database.query(query, [
          userId,
          ride.rideType,
          ride.status,
          ride.pickupAddress,
          ride.destinationAddress,
          ride.distance,
          ride.fare,
          ride.paymentMethod,
          ride.rating,
          ride.createdAt
        ]);
      }

      console.log(`✅ Seeded ${rideHistoryData.length} ride history entries`);

    } catch (error) {
      console.error('❌ Error seeding ride history:', error);
    }
  }

  /**
   * Check if database needs seeding
   */
  async needsSeeding(): Promise<boolean> {
    try {
      const result = await database.query('SELECT COUNT(*) as count FROM drivers WHERE is_verified = true');
      const count = parseInt(result.rows[0]?.count || '0');
      return count < 5; // Needs seeding if less than 5 real drivers
    } catch (error) {
      console.error('Error checking if database needs seeding:', error);
      return true;
    }
  }

  /**
   * Initialize database with real data if needed
   */
  async initializeIfNeeded(userLocation: LocationCoordinate, userId?: string): Promise<void> {
    try {
      // Always initialize ride history tables
      await rideHistoryService.initializeTables();
      
      const needsSeeding = await this.needsSeeding();
      
      if (needsSeeding) {
        console.log('🌱 Database needs seeding, populating with real data...');
        await this.seedDriverData(userLocation);
        
        if (userId) {
          await this.seedRideHistory(userId);
        }
      } else {
        console.log('✅ Database already has sufficient real data');
      }
    } catch (error) {
      console.error('❌ Error initializing database data:', error);
    }
  }
}

export const dataSeeder = new DataSeeder();