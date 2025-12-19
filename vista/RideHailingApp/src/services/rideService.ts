import { query } from './database';
import { webSocketService } from './websocketService';
import { notificationService } from './notificationService';
import { Ride, Location, RideStatus } from '../types';

// Create a new ride request
export const createRide = async (rideData: {
  rider_id: string;
  pickup_location: Location;
  destination_location: Location;
  ride_type: 'economy' | 'comfort' | 'premium' | 'xl';
  payment_method: 'cash' | 'card' | 'digital_wallet';
  fare: number;
  distance: number;
  estimated_duration: number;
}) => {
  try {
    const result = await query(
      `INSERT INTO rides (
        rider_id, pickup_location, destination_location, 
        ride_type, payment_method, fare, distance, estimated_duration, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        rideData.rider_id,
        JSON.stringify(rideData.pickup_location),
        JSON.stringify(rideData.destination_location),
        rideData.ride_type,
        rideData.payment_method,
        rideData.fare,
        rideData.distance,
        rideData.estimated_duration,
        'requested'
      ]
    );

    if (result.error) throw new Error(result.error);
    
    const ride = result.data[0];
    
    // Parse JSON fields back to objects
    ride.pickup_location = JSON.parse(ride.pickup_location);
    ride.destination_location = JSON.parse(ride.destination_location);
    
    // Notify drivers about new ride request via WebSocket
    webSocketService.requestRide(ride);
    
    return { data: ride, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Get rides for a specific user
export const getUserRides = async (userId: string, status?: RideStatus) => {
  try {
    let queryText = `
      SELECT r.*, 
             d.name as driver_name, 
             d.rating as driver_rating,
             d.vehicle_info
      FROM rides r
      LEFT JOIN drivers dr ON r.driver_id = dr.id
      LEFT JOIN users d ON dr.id = d.id
      WHERE r.rider_id = $1
    `;
    const params = [userId];
    
    if (status) {
      queryText += ' AND r.status = $2';
      params.push(status);
    }
    
    queryText += ' ORDER BY r.created_at DESC';
    
    const result = await query(queryText, params);

    if (result.error) throw new Error(result.error);
    
    // Parse JSON fields
    const rides = result.data.map((ride: any) => ({
      ...ride,
      pickup_location: JSON.parse(ride.pickup_location),
      destination_location: JSON.parse(ride.destination_location),
      vehicle_info: ride.vehicle_info ? JSON.parse(ride.vehicle_info) : null
    }));
    
    return { data: rides, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Get rides for a driver
export const getDriverRides = async (driverId: string, status?: RideStatus) => {
  try {
    let queryText = `
      SELECT r.*, 
             u.name as rider_name, 
             u.phone as rider_phone
      FROM rides r
      JOIN users u ON r.rider_id = u.id
      WHERE r.driver_id = $1
    `;
    const params = [driverId];
    
    if (status) {
      queryText += ' AND r.status = $2';
      params.push(status);
    }
    
    queryText += ' ORDER BY r.created_at DESC';
    
    const result = await query(queryText, params);

    if (result.error) throw new Error(result.error);
    
    // Parse JSON fields
    const rides = result.data.map((ride: any) => ({
      ...ride,
      pickup_location: JSON.parse(ride.pickup_location),
      destination_location: JSON.parse(ride.destination_location)
    }));
    
    return { data: rides, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Get a specific ride by ID
export const getRideById = async (rideId: string) => {
  try {
    const result = await query(
      `SELECT r.*, 
              d.name as driver_name, 
              d.rating as driver_rating,
              d.vehicle_info,
              u.name as rider_name,
              u.phone as rider_phone
       FROM rides r
       LEFT JOIN drivers dr ON r.driver_id = dr.id
       LEFT JOIN users d ON dr.id = d.id
       LEFT JOIN users u ON r.rider_id = u.id
       WHERE r.id = $1`,
      [rideId]
    );

    if (result.error) throw new Error(result.error);
    if (!result.data || result.data.length === 0) {
      throw new Error('Ride not found');
    }
    
    const ride = result.data[0];
    
    // Parse JSON fields
    ride.pickup_location = JSON.parse(ride.pickup_location);
    ride.destination_location = JSON.parse(ride.destination_location);
    if (ride.vehicle_info) {
      ride.vehicle_info = JSON.parse(ride.vehicle_info);
    }
    
    return { data: ride, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Update ride status
export const updateRideStatus = async (rideId: string, status: RideStatus, driverId?: string) => {
  try {
    let updateFields = ['status = $2', 'updated_at = NOW()'];
    let params = [rideId, status];
    let paramIndex = 3;

    if (driverId) {
      updateFields.push(`driver_id = $${paramIndex}`);
      params.push(driverId);
      paramIndex++;
    }

    if (status === 'accepted') {
      updateFields.push(`accepted_at = NOW()`);
    } else if (status === 'in_progress') {
      updateFields.push(`started_at = NOW()`);
    } else if (status === 'completed') {
      updateFields.push(`completed_at = NOW()`);
    } else if (status === 'cancelled') {
      updateFields.push(`cancelled_at = NOW()`);
    }

    const result = await query(
      `UPDATE rides SET ${updateFields.join(', ')} 
       WHERE id = $1 
       RETURNING *`,
      params
    );

    if (result.error) throw new Error(result.error);
    
    const ride = result.data[0];
    
    // Parse JSON fields
    ride.pickup_location = JSON.parse(ride.pickup_location);
    ride.destination_location = JSON.parse(ride.destination_location);
    
    // Send real-time update via WebSocket
    webSocketService.updateRideStatus({
      rideId,
      status,
      driverId,
      estimatedArrival: status === 'accepted' ? Date.now() + (10 * 60 * 1000) : undefined // 10 minutes estimate
    });

    // Send push notification to rider
    await notificationService.notifyRideStatusUpdate(ride.rider_id, rideId, status);
    
    return { data: ride, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Accept a ride (driver function)
export const acceptRide = async (rideId: string, driverId: string) => {
  try {
    // Check if ride is still available
    const rideCheck = await query(
      'SELECT status FROM rides WHERE id = $1',
      [rideId]
    );
    
    if (rideCheck.error) throw new Error(rideCheck.error);
    if (!rideCheck.data || rideCheck.data.length === 0) {
      throw new Error('Ride not found');
    }
    
    if (rideCheck.data[0].status !== 'requested') {
      throw new Error('Ride is no longer available');
    }
    
    // Update ride status to accepted
    const result = await updateRideStatus(rideId, 'accepted', driverId);
    
    if (result.error) throw new Error(result.error);
    
    // Send WebSocket notification
    webSocketService.acceptRide(rideId);
    
    return result;
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Rate a completed ride
export const rateRide = async (rideId: string, rating: number, notes?: string) => {
  try {
    const updateFields = ['rating = $2'];
    const params = [rideId, rating];
    
    if (notes) {
      updateFields.push('notes = $3');
      params.push(notes);
    }
    
    const result = await query(
      `UPDATE rides SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      params
    );

    if (result.error) throw new Error(result.error);
    
    const ride = result.data[0];
    
    // Parse JSON fields
    ride.pickup_location = JSON.parse(ride.pickup_location);
    ride.destination_location = JSON.parse(ride.destination_location);
    
    // Update driver's overall rating
    if (ride.driver_id) {
      await updateDriverRating(ride.driver_id);
    }
    
    return { data: ride, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Update driver's overall rating
const updateDriverRating = async (driverId: string) => {
  try {
    const result = await query(
      `UPDATE drivers 
       SET rating = (
         SELECT AVG(rating::numeric) 
         FROM rides 
         WHERE driver_id = $1 AND rating IS NOT NULL
       ),
       total_rides = (
         SELECT COUNT(*) 
         FROM rides 
         WHERE driver_id = $1 AND status = 'completed'
       )
       WHERE id = $1`,
      [driverId]
    );
    
    return result;
  } catch (error: any) {
    console.error('Error updating driver rating:', error);
    return { data: null, error: error.message };
  }
};

// Get available drivers near a location
export const getNearbyDrivers = async (location: Location, radius: number = 10) => {
  try {
    // Using PostgreSQL's PostGIS extension for geospatial queries
    // If PostGIS is not available, we'll use a simpler distance calculation
    const result = await query(
      `SELECT d.*, u.name, u.phone
       FROM drivers d
       JOIN users u ON d.id = u.id
       WHERE d.is_available = true 
         AND d.is_verified = true 
         AND d.current_location IS NOT NULL
         AND (
           6371 * acos(
             cos(radians($1)) * 
             cos(radians((d.current_location->>'latitude')::numeric)) * 
             cos(radians((d.current_location->>'longitude')::numeric) - radians($2)) + 
             sin(radians($1)) * 
             sin(radians((d.current_location->>'latitude')::numeric))
           )
         ) <= $3
       ORDER BY (
         6371 * acos(
           cos(radians($1)) * 
           cos(radians((d.current_location->>'latitude')::numeric)) * 
           cos(radians((d.current_location->>'longitude')::numeric) - radians($2)) + 
           sin(radians($1)) * 
           sin(radians((d.current_location->>'latitude')::numeric))
         )
       )
       LIMIT 20`,
      [location.latitude, location.longitude, radius]
    );

    if (result.error) throw new Error(result.error);
    
    // Parse JSON fields
    const drivers = result.data.map((driver: any) => ({
      ...driver,
      current_location: JSON.parse(driver.current_location),
      vehicle_info: JSON.parse(driver.vehicle_info)
    }));
    
    return { data: drivers, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Update driver location
export const updateDriverLocation = async (driverId: string, location: Location) => {
  try {
    const result = await query(
      `UPDATE drivers 
       SET current_location = $2, updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [driverId, JSON.stringify(location)]
    );

    if (result.error) throw new Error(result.error);
    
    const driver = result.data[0];
    if (driver) {
      driver.current_location = JSON.parse(driver.current_location);
      driver.vehicle_info = JSON.parse(driver.vehicle_info);
    }
    
    // Send real-time location update for active rides
    const activeRideResult = await query(
      `SELECT id FROM rides 
       WHERE driver_id = $1 AND status IN ('accepted', 'arriving', 'in_progress')`,
      [driverId]
    );
    
    if (activeRideResult.data && activeRideResult.data.length > 0) {
      const rideId = activeRideResult.data[0].id;
      webSocketService.updateDriverLocation({
        rideId,
        driverLocation: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
    }
    
    return { data: driver, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Set driver availability
export const setDriverAvailability = async (driverId: string, isAvailable: boolean) => {
  try {
    const result = await query(
      `UPDATE drivers 
       SET is_available = $2, updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [driverId, isAvailable]
    );

    if (result.error) throw new Error(result.error);
    
    const driver = result.data[0];
    if (driver) {
      if (driver.current_location) {
        driver.current_location = JSON.parse(driver.current_location);
      }
      driver.vehicle_info = JSON.parse(driver.vehicle_info);
    }
    
    // Send real-time availability update
    webSocketService.updateDriverAvailability(isAvailable);
    
    return { data: driver, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Add ride tracking record
export const addRideTracking = async (rideId: string, driverLocation: Location, speed?: number, heading?: number) => {
  try {
    const result = await query(
      `INSERT INTO ride_tracking (ride_id, driver_location, speed, heading)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [rideId, JSON.stringify(driverLocation), speed, heading]
    );

    if (result.error) throw new Error(result.error);
    
    const tracking = result.data[0];
    tracking.driver_location = JSON.parse(tracking.driver_location);
    
    // Send real-time tracking update
    webSocketService.updateDriverLocation({
      rideId,
      driverLocation: {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude
      },
      speed,
      heading
    });
    
    return { data: tracking, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Get ride tracking history
export const getRideTracking = async (rideId: string) => {
  try {
    const result = await query(
      `SELECT * FROM ride_tracking 
       WHERE ride_id = $1 
       ORDER BY timestamp ASC`,
      [rideId]
    );

    if (result.error) throw new Error(result.error);
    
    // Parse JSON fields
    const tracking = result.data.map((record: any) => ({
      ...record,
      driver_location: JSON.parse(record.driver_location)
    }));
    
    return { data: tracking, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Cancel ride
export const cancelRide = async (rideId: string, reason?: string) => {
  try {
    const result = await updateRideStatus(rideId, 'cancelled');
    
    if (result.error) throw new Error(result.error);
    
    // Send cancellation notification via WebSocket
    webSocketService.cancelRide(rideId, reason);
    
    return result;
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Helper function to calculate distance between two points (kept for compatibility)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};