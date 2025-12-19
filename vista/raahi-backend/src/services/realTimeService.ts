import { prisma } from '@/database/connection';
import { logger } from '@/utils/logger';
import { io } from '../index';

export interface RealTimeStats {
  totalDrivers: number;
  onlineDrivers: number;
  activeRides: number;
  completedRidesToday: number;
  averageWaitTime: number;
  surgeAreas: number;
}

export interface LocationStats {
  lat: number;
  lng: number;
  radius: number;
  availableDrivers: number;
  activeRides: number;
  demandRatio: number;
  averageFare: number;
}

export class RealTimeService {
  /**
   * Get real-time statistics
   */
  static async getRealTimeStats(): Promise<RealTimeStats> {
    try {
      const [
        totalDrivers,
        onlineDrivers,
        activeRides,
        completedRidesToday,
        surgeAreas
      ] = await Promise.all([
        prisma.driver.count(),
        prisma.driver.count({ where: { isOnline: true } }),
        prisma.ride.count({
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED']
            }
          }
        }),
        prisma.ride.count({
          where: {
            status: 'RIDE_COMPLETED',
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.surgeArea.count({ where: { isActive: true } })
      ]);

      // Calculate average wait time (simplified)
      const averageWaitTime = await this.calculateAverageWaitTime();

      return {
        totalDrivers,
        onlineDrivers,
        activeRides,
        completedRidesToday,
        averageWaitTime,
        surgeAreas
      };
    } catch (error) {
      logger.error('Error getting real-time stats:', error);
      throw new Error('Failed to get real-time statistics');
    }
  }

  /**
   * Get location-specific statistics
   */
  static async getLocationStats(
    lat: number,
    lng: number,
    radius: number = 5
  ): Promise<LocationStats> {
    try {
      // Get bounds for the search area
      const latRange = radius / 111; // Approximate km to degrees
      const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));

      const [availableDrivers, activeRides, averageFare] = await Promise.all([
        prisma.driver.count({
          where: {
            isOnline: true,
            isActive: true,
            currentLatitude: {
              gte: lat - latRange,
              lte: lat + latRange
            },
            currentLongitude: {
              gte: lng - lngRange,
              lte: lng + lngRange
            }
          }
        }),
        prisma.ride.count({
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED']
            },
            pickupLatitude: {
              gte: lat - latRange,
              lte: lat + latRange
            },
            pickupLongitude: {
              gte: lng - lngRange,
              lte: lng + lngRange
            }
          }
        }),
        this.calculateAverageFare(lat, lng, radius)
      ]);

      const demandRatio = availableDrivers > 0 ? activeRides / availableDrivers : 2.0;

      return {
        lat,
        lng,
        radius,
        availableDrivers,
        activeRides,
        demandRatio,
        averageFare
      };
    } catch (error) {
      logger.error('Error getting location stats:', error);
      throw new Error('Failed to get location statistics');
    }
  }

  /**
   * Update driver location in real-time
   */
  static async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
    heading?: number,
    speed?: number
  ): Promise<void> {
    try {
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLatitude: lat,
          currentLongitude: lng,
          lastActiveAt: new Date()
        }
      });

      // Emit location update to connected clients
      io.emit('driver-location-update', {
        driverId,
        lat,
        lng,
        heading,
        speed,
        timestamp: new Date().toISOString()
      });

      logger.info(`Driver ${driverId} location updated`, { lat, lng, heading, speed });
    } catch (error) {
      logger.error('Error updating driver location:', error);
      throw new Error('Failed to update driver location');
    }
  }

  /**
   * Broadcast ride status update
   */
  static async broadcastRideUpdate(
    rideId: string,
    status: string,
    data?: any
  ): Promise<void> {
    try {
      io.to(`ride-${rideId}`).emit('ride-status-update', {
        rideId,
        status,
        data,
        timestamp: new Date().toISOString()
      });

      logger.info(`Ride ${rideId} status update broadcasted`, { status, data });
    } catch (error) {
      logger.error('Error broadcasting ride update:', error);
    }
  }

  /**
   * Broadcast driver assignment
   */
  static async broadcastDriverAssignment(
    rideId: string,
    driver: any
  ): Promise<void> {
    try {
      io.to(`ride-${rideId}`).emit('driver-assigned', {
        rideId,
        driver,
        timestamp: new Date().toISOString()
      });

      logger.info(`Driver assignment broadcasted for ride ${rideId}`, { driver });
    } catch (error) {
      logger.error('Error broadcasting driver assignment:', error);
    }
  }

  /**
   * Broadcast new ride request to nearby online drivers
   */
  static async broadcastRideRequest(
    rideId: string,
    rideData: any,
    nearbyDrivers: string[]
  ): Promise<void> {
    try {
      const rideRequest = {
        rideId,
        pickupLocation: {
          lat: rideData.pickupLatitude,
          lng: rideData.pickupLongitude,
          address: rideData.pickupAddress
        },
        dropLocation: {
          lat: rideData.dropLatitude,
          lng: rideData.dropLongitude,
          address: rideData.dropAddress
        },
        distance: rideData.distance,
        estimatedFare: rideData.totalFare,
        paymentMethod: rideData.paymentMethod,
        vehicleType: rideData.vehicleType || 'SEDAN',
        passengerName: rideData.passengerName || 'Passenger',
        timestamp: new Date().toISOString()
      };

      // Broadcast to all nearby drivers
      nearbyDrivers.forEach(driverId => {
        io.to(`driver-${driverId}`).emit('new-ride-request', rideRequest);
      });

      // Also broadcast to all online drivers (for testing)
      io.emit('new-ride-request', rideRequest);

      logger.info(`Ride request ${rideId} broadcasted to ${nearbyDrivers.length} drivers`, {
        rideId,
        nearbyDrivers: nearbyDrivers.length,
        pickupAddress: rideData.pickupAddress,
        dropAddress: rideData.dropAddress,
        fare: rideData.totalFare
      });
    } catch (error) {
      logger.error('Error broadcasting ride request:', error);
    }
  }

  /**
   * Find nearby online drivers for a ride request
   */
  static async findNearbyDrivers(
    lat: number,
    lng: number,
    radius: number = 10,
    vehicleType?: string
  ): Promise<string[]> {
    try {
      const latRange = radius / 111; // Approximate km to degrees
      const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));

      const drivers = await prisma.driver.findMany({
        where: {
          isOnline: true,
          isActive: true,
          currentLatitude: {
            gte: lat - latRange,
            lte: lat + latRange
          },
          currentLongitude: {
            gte: lng - lngRange,
            lte: lng + lngRange
          }
        },
        select: {
          id: true,
          vehicleModel: true,
          rating: true,
          currentLatitude: true,
          currentLongitude: true
        }
      });

      // Filter by vehicle type if specified
      const filteredDrivers = vehicleType 
        ? drivers.filter(driver => 
            (driver.vehicleModel && driver.vehicleModel.toLowerCase().includes(vehicleType.toLowerCase())) ||
            vehicleType === 'SEDAN' // Default fallback
          )
        : drivers;

      return filteredDrivers.map(driver => driver.id);
    } catch (error) {
      logger.error('Error finding nearby drivers:', error);
      return [];
    }
  }

  /**
   * Get heatmap data for drivers
   */
  static async getDriverHeatmapData(): Promise<Array<{ lat: number; lng: number; count: number }>> {
    try {
      const drivers = await prisma.driver.findMany({
        where: {
          isOnline: true,
          currentLatitude: { not: null },
          currentLongitude: { not: null }
        },
        select: {
          currentLatitude: true,
          currentLongitude: true
        }
      });

      // Group drivers by location (simplified clustering)
      const heatmapData = new Map<string, { lat: number; lng: number; count: number }>();

      drivers.forEach(driver => {
        if (driver.currentLatitude && driver.currentLongitude) {
          // Round to 3 decimal places for clustering
          const lat = Math.round(driver.currentLatitude * 1000) / 1000;
          const lng = Math.round(driver.currentLongitude * 1000) / 1000;
          const key = `${lat},${lng}`;

          if (heatmapData.has(key)) {
            heatmapData.get(key)!.count++;
          } else {
            heatmapData.set(key, { lat, lng, count: 1 });
          }
        }
      });

      return Array.from(heatmapData.values());
    } catch (error) {
      logger.error('Error getting driver heatmap data:', error);
      return [];
    }
  }

  /**
   * Get demand hotspots
   */
  static async getDemandHotspots(): Promise<Array<{ lat: number; lng: number; demand: number }>> {
    try {
      // Get areas with high ride density
      const hotspots = await prisma.ride.groupBy({
        by: ['pickupLatitude', 'pickupLongitude'],
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED']
          },
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        _count: {
          id: true
        },
        having: {
          id: {
            _count: {
              gte: 3 // At least 3 rides in the area
            }
          }
        }
      });

      return hotspots.map(hotspot => ({
        lat: hotspot.pickupLatitude,
        lng: hotspot.pickupLongitude,
        demand: hotspot._count.id
      }));
    } catch (error) {
      logger.error('Error getting demand hotspots:', error);
      return [];
    }
  }

  /**
   * Calculate average wait time
   */
  private static async calculateAverageWaitTime(): Promise<number> {
    try {
      const recentRides = await prisma.ride.findMany({
        where: {
          status: 'RIDE_COMPLETED',
          startedAt: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          createdAt: true,
          startedAt: true
        }
      });

      if (recentRides.length === 0) return 0;

      const totalWaitTime = recentRides.reduce((sum, ride) => {
        if (ride.startedAt) {
          const waitTime = ride.startedAt.getTime() - ride.createdAt.getTime();
          return sum + waitTime;
        }
        return sum;
      }, 0);

      return totalWaitTime / recentRides.length / 1000 / 60; // Convert to minutes
    } catch (error) {
      logger.error('Error calculating average wait time:', error);
      return 0;
    }
  }

  /**
   * Calculate average fare for a location
   */
  private static async calculateAverageFare(
    lat: number,
    lng: number,
    radius: number
  ): Promise<number> {
    try {
      const latRange = radius / 111;
      const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));

      const result = await prisma.ride.aggregate({
        where: {
          status: 'RIDE_COMPLETED',
          pickupLatitude: {
            gte: lat - latRange,
            lte: lat + latRange
          },
          pickupLongitude: {
            gte: lng - lngRange,
            lte: lng + lngRange
          },
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        _avg: {
          totalFare: true
        }
      });

      return result._avg.totalFare || 0;
    } catch (error) {
      logger.error('Error calculating average fare:', error);
      return 0;
    }
  }
}

