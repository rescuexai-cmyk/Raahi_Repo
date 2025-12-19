import { database } from './database';

export interface RideHistoryItem {
  id: string;
  date: string;
  from: string;
  to: string;
  fare: number;
  distance: string;
  duration: string;
  status: 'completed' | 'cancelled' | 'in_progress';
  rating?: number;
  rideType: string;
  driverName?: string;
  vehicleInfo?: string;
  paymentMethod?: string;
}

class RideHistoryService {
  /**
   * Get ride history for a user
   */
  async getUserRideHistory(userId: string, filter: 'all' | 'completed' | 'cancelled' = 'all'): Promise<RideHistoryItem[]> {
    try {
      let query = `
        SELECT 
          r.id,
          r.created_at,
          r.pickup_address,
          r.destination_address,
          r.fare_amount,
          r.distance_km,
          r.duration_minutes,
          r.status,
          r.user_rating,
          r.ride_type,
          r.payment_method,
          d.name as driver_name,
          v.type as vehicle_type,
          v.model as vehicle_model,
          v.color as vehicle_color,
          v.plate_number
        FROM rides r
        LEFT JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN vehicles v ON d.id = v.driver_id
        WHERE r.user_id = $1
      `;

      const params = [userId];

      if (filter !== 'all') {
        query += ` AND r.status = $2`;
        params.push(filter);
      }

      query += ` ORDER BY r.created_at DESC LIMIT 50`;

      const result = await database.query(query, params);

      if (!result.rows) {
        return [];
      }

      // Transform database rows to RideHistoryItem format
      const rides: RideHistoryItem[] = result.rows.map((row: any) => ({
        id: row.id,
        date: new Date(row.created_at).toISOString().split('T')[0],
        from: row.pickup_address || 'Unknown',
        to: row.destination_address || 'Unknown',
        fare: parseFloat(row.fare_amount || '0'),
        distance: row.distance_km ? `${row.distance_km} km` : 'N/A',
        duration: row.duration_minutes ? `${row.duration_minutes} min` : 'N/A',
        status: row.status,
        rating: row.user_rating,
        rideType: this.formatRideType(row.ride_type),
        driverName: row.driver_name,
        vehicleInfo: row.vehicle_type && row.vehicle_model ? 
          `${row.vehicle_color} ${row.vehicle_type} ${row.vehicle_model}` : 
          undefined,
        paymentMethod: row.payment_method
      }));

      console.log(`✅ Loaded ${rides.length} ride history entries for user ${userId}`);
      return rides;

    } catch (error) {
      console.error('❌ Error loading ride history:', error);
      return [];
    }
  }

  /**
   * Get ride statistics for a user
   */
  async getUserRideStats(userId: string): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalSpent: number;
    averageRating: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_rides,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_rides,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN fare_amount END), 0) as total_spent,
          COALESCE(AVG(CASE WHEN user_rating IS NOT NULL THEN user_rating END), 0) as average_rating
        FROM rides 
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);

      if (!result.rows || result.rows.length === 0) {
        return {
          totalRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          totalSpent: 0,
          averageRating: 0
        };
      }

      const row = result.rows[0];
      return {
        totalRides: parseInt(row.total_rides || '0'),
        completedRides: parseInt(row.completed_rides || '0'),
        cancelledRides: parseInt(row.cancelled_rides || '0'),
        totalSpent: parseFloat(row.total_spent || '0'),
        averageRating: parseFloat(row.average_rating || '0')
      };

    } catch (error) {
      console.error('❌ Error loading ride statistics:', error);
      return {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        averageRating: 0
      };
    }
  }

  /**
   * Get ride details by ID
   */
  async getRideDetails(rideId: string): Promise<RideHistoryItem | null> {
    try {
      const query = `
        SELECT 
          r.*,
          d.name as driver_name,
          d.phone as driver_phone,
          d.rating as driver_rating,
          v.type as vehicle_type,
          v.model as vehicle_model,
          v.color as vehicle_color,
          v.plate_number,
          v.year as vehicle_year
        FROM rides r
        LEFT JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN vehicles v ON d.id = v.driver_id
        WHERE r.id = $1
      `;

      const result = await database.query(query, [rideId]);

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        date: new Date(row.created_at).toISOString().split('T')[0],
        from: row.pickup_address || 'Unknown',
        to: row.destination_address || 'Unknown',
        fare: parseFloat(row.fare_amount || '0'),
        distance: row.distance_km ? `${row.distance_km} km` : 'N/A',
        duration: row.duration_minutes ? `${row.duration_minutes} min` : 'N/A',
        status: row.status,
        rating: row.user_rating,
        rideType: this.formatRideType(row.ride_type),
        driverName: row.driver_name,
        vehicleInfo: row.vehicle_type && row.vehicle_model ? 
          `${row.vehicle_color} ${row.vehicle_type} ${row.vehicle_model} (${row.vehicle_year})` : 
          undefined,
        paymentMethod: row.payment_method
      };

    } catch (error) {
      console.error('❌ Error loading ride details:', error);
      return null;
    }
  }

  /**
   * Format ride type for display
   */
  private formatRideType(rideType: string): string {
    const typeMap: Record<string, string> = {
      'bike': 'RideBike',
      'economy': 'RideGo',
      'comfort': 'RideComfort',
      'premium': 'RidePremium',
      'xl': 'RideXL'
    };

    return typeMap[rideType] || rideType.charAt(0).toUpperCase() + rideType.slice(1);
  }

  /**
   * Create the rides table if it doesn't exist
   */
  async initializeTables(): Promise<void> {
    try {
      const createRidesTable = `
        CREATE TABLE IF NOT EXISTS rides (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          driver_id UUID REFERENCES drivers(id),
          ride_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
          pickup_address TEXT,
          destination_address TEXT,
          pickup_latitude DECIMAL(10, 8),
          pickup_longitude DECIMAL(11, 8),
          destination_latitude DECIMAL(10, 8),
          destination_longitude DECIMAL(11, 8),
          distance_km DECIMAL(6, 2),
          duration_minutes INTEGER,
          fare_amount DECIMAL(8, 2),
          payment_method VARCHAR(50),
          user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
          driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP
        );
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id);
        CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
        CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at);
        CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
      `;

      await database.query(createRidesTable);
      await database.query(createIndexes);

      console.log('✅ Ride history tables initialized');

    } catch (error) {
      console.error('❌ Error initializing ride history tables:', error);
    }
  }
}

export const rideHistoryService = new RideHistoryService();