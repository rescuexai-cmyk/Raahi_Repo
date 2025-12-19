import { apiClient } from './apiClient';
import { LocationCoordinate } from './mapsService';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  rating: number;
  status: 'available' | 'busy' | 'offline' | 'on_ride';
  total_rides: number;
  vehicle_info: VehicleInfo;
  license_number: string;
  is_verified: boolean;
  is_available: boolean;
  current_location?: LocationCoordinate;
  user_type: 'driver';
  created_at: string;
  updated_at: string;
}

export interface VehicleInfo {
  type: string;
  color: string;
  plateNumber: string;
  model?: string;
  year?: number;
}

export interface DriverLocation {
  driverId: string;
  location: LocationCoordinate;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

class DriverService {
  
  /**
   * Get nearby drivers within a specified radius
   */
  async getNearbyDrivers(
    location: LocationCoordinate,
    radius: number = 5000,
    rideType?: string
  ): Promise<Driver[]> {
    try {
      const result = await apiClient.getNearbyDrivers(location, radius);
      
      if (result.success && result.drivers) {
        return result.drivers;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
  }

  /**
   * Get driver details by ID
   */
  async getDriverById(driverId: string): Promise<Driver | null> {
    try {
      const result = await apiClient.getDriverById(driverId);
      
      if (result.success && result.driver) {
        return result.driver;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting driver by ID:', error);
      return null;
    }
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(
    driverId: string,
    location: LocationCoordinate,
    heading?: number
  ): Promise<void> {
    try {
      await apiClient.updateDriverLocation(driverId, location, heading);
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Update driver status
   */
  async updateDriverStatus(
    driverId: string,
    status: Driver['status']
  ): Promise<void> {
    try {
      await apiClient.updateDriverStatus(driverId, status);
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  /**
   * Get driver location
   */
  async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      const driver = await this.getDriverById(driverId);
      
      if (driver && driver.current_location) {
        return {
          driverId: driver.id,
          location: driver.current_location,
          timestamp: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting driver location:', error);
      return null;
    }
  }

  /**
   * Find best driver for a ride request
   */
  async findBestDriver(
    pickupLocation: LocationCoordinate,
    rideType: string,
    maxDistance: number = 10
  ): Promise<Driver | null> {
    try {
      const nearbyDrivers = await this.getNearbyDrivers(pickupLocation, maxDistance * 1000, rideType);
      
      if (nearbyDrivers.length === 0) {
        return null;
      }
      
      // Sort by rating and distance
      const sortedDrivers = nearbyDrivers.sort((a, b) => {
        return b.rating - a.rating; // Higher rating first
      });
      
      return sortedDrivers[0];
    } catch (error) {
      console.error('Error finding best driver:', error);
      return null;
    }
  }

  /**
   * Check if driver is available
   */
  async isDriverAvailable(driverId: string): Promise<boolean> {
    try {
      const driver = await this.getDriverById(driverId);
      return driver ? driver.is_available && driver.status === 'available' : false;
    } catch (error) {
      console.error('Error checking driver availability:', error);
      return false;
    }
  }

  /**
   * Get drivers by status
   */
  async getDriversByStatus(status: Driver['status']): Promise<Driver[]> {
    try {
      // This would be implemented as a specific API endpoint
      const result = await apiClient.getNearbyDrivers({ lat: 0, lng: 0 }, 999999);
      
      if (result.success && result.drivers) {
        return result.drivers.filter((driver: Driver) => driver.status === status);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting drivers by status:', error);
      return [];
    }
  }

  /**
   * Register a new driver
   */
  async registerDriver(driverData: {
    userId: string;
    name: string;
    phone: string;
    address: string;
    vehicleNumber: string;
    vehicleType: string;
    vehicleModel: string;
    vehicleColor: string;
    licenseNumber: string;
  }): Promise<{ success: boolean; driver?: Driver; error?: string }> {
    try {
      const result = await apiClient.registerDriver(driverData);
      return result;
    } catch (error: any) {
      console.error('Error registering driver:', error);
      return { success: false, error: error.message };
    }
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const driverService = new DriverService();
export default driverService;