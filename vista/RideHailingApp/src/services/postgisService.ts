import { query } from './database';

// PostGIS spatial service for production-ready location handling
class PostGISService {
  
  // Initialize PostGIS extension and spatial tables
  async initialize(): Promise<void> {
    try {
      const initSQL = `
        -- Enable PostGIS extension
        CREATE EXTENSION IF NOT EXISTS postgis;
        CREATE EXTENSION IF NOT EXISTS postgis_topology;
        
        -- Driver locations table with spatial data
        CREATE TABLE IF NOT EXISTS driver_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
          location GEOMETRY(POINT, 4326) NOT NULL,
          heading REAL,
          speed REAL,
          accuracy REAL,
          altitude REAL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Ride locations table for route tracking
        CREATE TABLE IF NOT EXISTS ride_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
          location GEOMETRY(POINT, 4326) NOT NULL,
          location_type VARCHAR(20) CHECK (location_type IN ('pickup', 'dropoff', 'waypoint', 'current')) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Geofences table for zones (airports, city limits, etc.)
        CREATE TABLE IF NOT EXISTS geofences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          zone_type VARCHAR(50) NOT NULL,
          geometry GEOMETRY(POLYGON, 4326) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Spatial indexes for performance
        CREATE INDEX IF NOT EXISTS idx_driver_locations_gist 
        ON driver_locations USING GIST(location);
        
        CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time 
        ON driver_locations(driver_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_ride_locations_gist 
        ON ride_locations USING GIST(location);
        
        CREATE INDEX IF NOT EXISTS idx_geofences_gist 
        ON geofences USING GIST(geometry);
        
        -- Partial index for active drivers only
        CREATE INDEX IF NOT EXISTS idx_active_driver_locations 
        ON driver_locations USING GIST(location) 
        WHERE is_active = true AND created_at > NOW() - INTERVAL '10 minutes';
        
        -- Function to update driver location
        CREATE OR REPLACE FUNCTION update_driver_location(
          p_driver_id UUID,
          p_lat DOUBLE PRECISION,
          p_lng DOUBLE PRECISION,
          p_heading REAL DEFAULT NULL,
          p_speed REAL DEFAULT NULL,
          p_accuracy REAL DEFAULT NULL,
          p_altitude REAL DEFAULT NULL
        ) RETURNS UUID AS $$
        DECLARE
          location_id UUID;
        BEGIN
          -- Deactivate old locations
          UPDATE driver_locations 
          SET is_active = false 
          WHERE driver_id = p_driver_id AND is_active = true;
          
          -- Insert new location
          INSERT INTO driver_locations (
            driver_id, location, heading, speed, accuracy, altitude
          ) VALUES (
            p_driver_id, 
            ST_Point(p_lng, p_lat), 
            p_heading, 
            p_speed, 
            p_accuracy, 
            p_altitude
          ) RETURNING id INTO location_id;
          
          RETURN location_id;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Function to find nearby drivers
        CREATE OR REPLACE FUNCTION find_nearby_drivers(
          p_lat DOUBLE PRECISION,
          p_lng DOUBLE PRECISION,
          p_radius_km DOUBLE PRECISION DEFAULT 5.0,
          p_limit INTEGER DEFAULT 10
        ) RETURNS TABLE(
          driver_id UUID,
          driver_name VARCHAR(255),
          distance_meters DOUBLE PRECISION,
          heading REAL,
          speed REAL,
          last_seen TIMESTAMP WITH TIME ZONE
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            d.id,
            d.name,
            ST_Distance(dl.location::geography, ST_Point(p_lng, p_lat)::geography) as distance_meters,
            dl.heading,
            dl.speed,
            dl.created_at
          FROM drivers d
          JOIN driver_locations dl ON d.id = dl.driver_id
          WHERE d.is_available = true 
            AND d.is_verified = true
            AND dl.is_active = true
            AND dl.created_at > NOW() - INTERVAL '5 minutes'
            AND ST_DWithin(
              dl.location::geography, 
              ST_Point(p_lng, p_lat)::geography, 
              p_radius_km * 1000
            )
          ORDER BY distance_meters
          LIMIT p_limit;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Function to check if location is in geofence
        CREATE OR REPLACE FUNCTION check_geofence(
          p_lat DOUBLE PRECISION,
          p_lng DOUBLE PRECISION,
          p_zone_type VARCHAR(50) DEFAULT NULL
        ) RETURNS TABLE(
          geofence_id UUID,
          geofence_name VARCHAR(255),
          zone_type VARCHAR(50),
          is_inside BOOLEAN
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            g.id,
            g.name,
            g.zone_type,
            ST_Contains(g.geometry, ST_Point(p_lng, p_lat)) as is_inside
          FROM geofences g
          WHERE g.is_active = true
            AND (p_zone_type IS NULL OR g.zone_type = p_zone_type)
            AND ST_Contains(g.geometry, ST_Point(p_lng, p_lat));
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      await query(initSQL);
      console.log('PostGIS service initialized successfully');
    } catch (error) {
      console.error('Error initializing PostGIS service:', error);
      throw error;
    }
  }
  
  // Update driver location
  async updateDriverLocation(
    driverId: string, 
    lat: number, 
    lng: number, 
    options: {
      heading?: number;
      speed?: number;
      accuracy?: number;
      altitude?: number;
    } = {}
  ): Promise<string> {
    try {
      const result = await query(
        'SELECT update_driver_location($1, $2, $3, $4, $5, $6, $7)',
        [driverId, lat, lng, options.heading, options.speed, options.accuracy, options.altitude]
      );
      
      return result.data[0].update_driver_location;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }
  
  // Find nearby available drivers
  async findNearbyDrivers(
    lat: number, 
    lng: number, 
    radiusKm: number = 5, 
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await query(
        'SELECT * FROM find_nearby_drivers($1, $2, $3, $4)',
        [lat, lng, radiusKm, limit]
      );
      
      return result.data || [];
    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      throw error;
    }
  }
  
  // Calculate distance between two points
  async calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): Promise<number> {
    try {
      const result = await query(
        `SELECT ST_Distance(
          ST_Point($1, $2)::geography, 
          ST_Point($3, $4)::geography
        ) as distance_meters`,
        [lng1, lat1, lng2, lat2]
      );
      
      return result.data[0].distance_meters;
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }
  
  // Get driver's last known location
  async getDriverLocation(driverId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          ST_Y(location) as lat,
          ST_X(location) as lng,
          heading,
          speed,
          accuracy,
          altitude,
          created_at
        FROM driver_locations 
        WHERE driver_id = $1 AND is_active = true
        ORDER BY created_at DESC 
        LIMIT 1`,
        [driverId]
      );
      
      return result.data[0] || null;
    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  }
  
  // Store ride location (pickup, dropoff, waypoints)
  async storeRideLocation(
    rideId: string, 
    lat: number, 
    lng: number, 
    locationType: 'pickup' | 'dropoff' | 'waypoint' | 'current'
  ): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO ride_locations (ride_id, location, location_type) 
         VALUES ($1, ST_Point($2, $3), $4) 
         RETURNING id`,
        [rideId, lng, lat, locationType]
      );
      
      return result.data[0].id;
    } catch (error) {
      console.error('Error storing ride location:', error);
      throw error;
    }
  }
  
  // Check if location is within geofence
  async checkGeofence(
    lat: number, 
    lng: number, 
    zoneType?: string
  ): Promise<any[]> {
    try {
      const result = await query(
        'SELECT * FROM check_geofence($1, $2, $3)',
        [lat, lng, zoneType]
      );
      
      return result.data || [];
    } catch (error) {
      console.error('Error checking geofence:', error);
      throw error;
    }
  }
  
  // Create a geofence
  async createGeofence(
    name: string,
    zoneType: string,
    coordinates: number[][],
    metadata: any = {}
  ): Promise<string> {
    try {
      // Convert coordinates to PostGIS polygon
      const polygonCoords = coordinates.map(coord => `${coord[1]} ${coord[0]}`).join(',');
      const polygonWKT = `POLYGON((${polygonCoords}))`;
      
      const result = await query(
        `INSERT INTO geofences (name, zone_type, geometry, metadata) 
         VALUES ($1, $2, ST_GeomFromText($3, 4326), $4) 
         RETURNING id`,
        [name, zoneType, polygonWKT, JSON.stringify(metadata)]
      );
      
      return result.data[0].id;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  }
  
  // Get route distance and duration estimate
  async getRouteEstimate(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<{ distance: number; duration: number }> {
    try {
      // This is a simplified calculation. In production, integrate with:
      // - Google Maps Directions API
      // - Mapbox Directions API
      // - OSRM (Open Source Routing Machine)
      
      const distance = await this.calculateDistance(startLat, startLng, endLat, endLng);
      
      // Simple duration estimation (can be improved with traffic data)
      const averageSpeedKmh = 30; // Average city speed
      const duration = (distance / 1000) / averageSpeedKmh * 3600; // seconds
      
      return {
        distance: Math.round(distance),
        duration: Math.round(duration)
      };
    } catch (error) {
      console.error('Error calculating route estimate:', error);
      throw error;
    }
  }
  
  // Get drivers within polygon area
  async getDriversInArea(coordinates: number[][]): Promise<any[]> {
    try {
      const polygonCoords = coordinates.map(coord => `${coord[1]} ${coord[0]}`).join(',');
      const polygonWKT = `POLYGON((${polygonCoords}))`;
      
      const result = await query(
        `SELECT 
          d.id,
          d.name,
          ST_Y(dl.location) as lat,
          ST_X(dl.location) as lng,
          dl.heading,
          dl.speed,
          dl.created_at
        FROM drivers d
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.is_available = true 
          AND dl.is_active = true
          AND dl.created_at > NOW() - INTERVAL '5 minutes'
          AND ST_Contains(ST_GeomFromText($1, 4326), dl.location)`,
        [polygonWKT]
      );
      
      return result.data || [];
    } catch (error) {
      console.error('Error getting drivers in area:', error);
      throw error;
    }
  }
  
  // Analytics: Get driver density in areas
  async getDriverDensity(
    lat: number,
    lng: number,
    radiusKm: number = 2
  ): Promise<{ count: number; averageDistance: number }> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as driver_count,
          AVG(ST_Distance(dl.location::geography, ST_Point($2, $1)::geography)) as avg_distance
        FROM drivers d
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.is_available = true 
          AND dl.is_active = true
          AND dl.created_at > NOW() - INTERVAL '5 minutes'
          AND ST_DWithin(
            dl.location::geography, 
            ST_Point($2, $1)::geography, 
            $3 * 1000
          )`,
        [lat, lng, radiusKm]
      );
      
      const data = result.data[0];
      return {
        count: parseInt(data.driver_count) || 0,
        averageDistance: parseFloat(data.avg_distance) || 0
      };
    } catch (error) {
      console.error('Error getting driver density:', error);
      throw error;
    }
  }
  
  // Cleanup old location data
  async cleanupOldLocations(hoursOld: number = 24): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM driver_locations 
         WHERE created_at < NOW() - INTERVAL '${hoursOld} hours'
         AND is_active = false`,
        []
      );
      
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up old locations:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const postgisService = new PostGISService();

// Export types
export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  altitude?: number;
  timestamp: string;
}

export interface NearbyDriver {
  driverId: string;
  driverName: string;
  distance: number;
  heading?: number;
  speed?: number;
  lastSeen: string;
}

export interface GeofenceCheck {
  geofenceId: string;
  geofenceName: string;
  zoneType: string;
  isInside: boolean;
}