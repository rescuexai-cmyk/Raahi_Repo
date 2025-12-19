import { getDistance, getBoundsOfDistance } from 'geolib';
import { prisma } from '@/database/connection';
import { logger } from '@/utils/logger';

export interface PricingRequest {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  vehicleType?: string;
  scheduledTime?: Date;
}

export interface PricingResponse {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  peakHourMultiplier: number;
  totalFare: number;
  distance: number;
  estimatedDuration: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeAmount: number;
    peakHourAmount: number;
    subtotal: number;
    total: number;
  };
}

export class PricingService {
  // Dynamic pricing configuration - will be loaded from database
  private static baseFare: number = 25;
  private static perKmRate: number = 12;
  private static perMinuteRate: number = 2;
  private static surgeMultiplierMax: number = 3.0;
  private static peakHourMultiplier: number = 1.5;

  /**
   * Load pricing configuration from environment variables and database
   */
  private static async loadPricingConfiguration(): Promise<void> {
    try {
      // Load from environment variables as fallback
      this.baseFare = parseFloat(process.env.BASE_FARE || '25');
      this.perKmRate = parseFloat(process.env.PER_KM_RATE || '12');
      this.perMinuteRate = parseFloat(process.env.PER_MINUTE_RATE || '2');
      this.surgeMultiplierMax = parseFloat(process.env.SURGE_MULTIPLIER_MAX || '3.0');
      this.peakHourMultiplier = parseFloat(process.env.PEAK_HOUR_MULTIPLIER || '1.5');

      // Try to load from database for real-time updates
      const pricingRule = await this.getCurrentPricingRule();
      if (pricingRule) {
        this.baseFare = pricingRule.baseFare;
        this.perKmRate = pricingRule.perKmRate;
        this.perMinuteRate = pricingRule.perMinuteRate;
        this.surgeMultiplierMax = pricingRule.surgeMultiplier;
        this.peakHourMultiplier = pricingRule.peakHourMultiplier;
      }
    } catch (error) {
      logger.error('Error loading pricing configuration:', error);
      // Continue with environment variable values
    }
  }

  /**
   * Calculate fare for a ride
   */
  static async calculateFare(request: PricingRequest): Promise<PricingResponse> {
    try {
      // Load current pricing configuration from database
      await this.loadPricingConfiguration();
      
      // Calculate distance and estimated duration
      const distance = this.calculateDistance(
        request.pickupLat,
        request.pickupLng,
        request.dropLat,
        request.dropLng
      );
      
      const estimatedDuration = this.estimateDuration(distance);
      
      // Get current pricing rules
      const pricingRule = await this.getCurrentPricingRule();
      
      // Calculate base components
      const baseFare = pricingRule.baseFare;
      const distanceFare = distance * pricingRule.perKmRate;
      const timeFare = estimatedDuration * pricingRule.perMinuteRate;
      
      // Calculate surge multiplier
      const surgeMultiplier = await this.calculateSurgeMultiplier(
        request.pickupLat,
        request.pickupLng,
        request.scheduledTime
      );
      
      // Calculate peak hour multiplier
      const peakHourMultiplier = this.calculatePeakHourMultiplier(request.scheduledTime);
      
      // Calculate subtotal
      const subtotal = baseFare + distanceFare + timeFare;
      
      // Apply multipliers
      const surgeAmount = subtotal * (surgeMultiplier - 1);
      const peakHourAmount = subtotal * (peakHourMultiplier - 1);
      const totalFare = subtotal * surgeMultiplier * peakHourMultiplier;
      
      const response: PricingResponse = {
        baseFare,
        distanceFare,
        timeFare,
        surgeMultiplier,
        peakHourMultiplier,
        totalFare: Math.round(totalFare * 100) / 100, // Round to 2 decimal places
        distance: Math.round(distance * 100) / 100,
        estimatedDuration,
        breakdown: {
          baseFare,
          distanceFare,
          timeFare,
          surgeAmount: Math.round(surgeAmount * 100) / 100,
          peakHourAmount: Math.round(peakHourAmount * 100) / 100,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(totalFare * 100) / 100
        }
      };
      
      logger.info('Fare calculated', { request, response });
      return response;
      
    } catch (error) {
      logger.error('Error calculating fare:', error);
      throw new Error('Failed to calculate fare');
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const distance = getDistance(
      { latitude: lat1, longitude: lng1 },
      { latitude: lat2, longitude: lng2 }
    );
    return distance / 1000; // Convert meters to kilometers
  }

  /**
   * Estimate ride duration based on distance
   */
  private static estimateDuration(distance: number): number {
    // Average speed in km/h (considering traffic)
    const averageSpeed = 25;
    return Math.ceil((distance / averageSpeed) * 60); // Convert to minutes
  }

  /**
   * Get current active pricing rule
   */
  private static async getCurrentPricingRule() {
    const now = new Date();
    
    const rule = await prisma.pricingRule.findFirst({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!rule) {
      // Return default pricing if no rule found
      return {
        baseFare: this.baseFare,
        perKmRate: this.perKmRate,
        perMinuteRate: this.perMinuteRate,
        surgeMultiplier: 1.0,
        peakHourMultiplier: 1.0
      };
    }

    return rule;
  }

  /**
   * Calculate surge multiplier based on real-time demand and location
   */
  private static async calculateSurgeMultiplier(
    lat: number,
    lng: number,
    scheduledTime?: Date
  ): Promise<number> {
    try {
      // Check if location is in a surge area
      const surgeArea = await prisma.surgeArea.findFirst({
        where: {
          isActive: true,
          centerLatitude: {
            gte: lat - 0.01, // Approximate 1km radius
            lte: lat + 0.01
          },
          centerLongitude: {
            gte: lng - 0.01,
            lte: lng + 0.01
          }
        }
      });

      if (surgeArea) {
        return surgeArea.multiplier;
      }

      // Calculate real-time demand-based surge
      const time = scheduledTime || new Date();
      const hour = time.getHours();
      
      // Get real-time demand data
      const demandData = await this.getRealTimeDemand(lat, lng, time);
      
      // Peak hours: 7-9 AM, 5-8 PM
      const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
      
      if (isPeakHour || demandData.demandRatio > 1.5) {
        // Calculate surge based on actual demand
        const baseSurge = isPeakHour ? 1.2 : 1.0;
        const demandSurge = Math.min(demandData.demandRatio * 0.5, 1.0);
        const totalSurge = baseSurge + demandSurge;
        
        return Math.min(totalSurge, this.surgeMultiplierMax);
      }

      return 1.0;
    } catch (error) {
      logger.error('Error calculating surge multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Get real-time demand data for a location
   */
  private static async getRealTimeDemand(
    lat: number,
    lng: number,
    time: Date
  ): Promise<{ demandRatio: number; availableDrivers: number; activeRides: number }> {
    try {
      // Get nearby drivers count
      const nearbyDrivers = await this.getNearbyDrivers(lat, lng, 5);
      const availableDrivers = nearbyDrivers.filter(driver => driver.isOnline).length;

      // Get active rides in the area
      const activeRides = await prisma.ride.count({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED']
          },
          pickupLatitude: {
            gte: lat - 0.01,
            lte: lat + 0.01
          },
          pickupLongitude: {
            gte: lng - 0.01,
            lte: lng + 0.01
          },
          createdAt: {
            gte: new Date(time.getTime() - 30 * 60 * 1000) // Last 30 minutes
          }
        }
      });

      // Calculate demand ratio
      const demandRatio = availableDrivers > 0 ? activeRides / availableDrivers : 2.0;

      return {
        demandRatio,
        availableDrivers,
        activeRides
      };
    } catch (error) {
      logger.error('Error getting real-time demand:', error);
      return {
        demandRatio: 1.0,
        availableDrivers: 0,
        activeRides: 0
      };
    }
  }

  /**
   * Calculate peak hour multiplier
   */
  private static calculatePeakHourMultiplier(scheduledTime?: Date): number {
    const time = scheduledTime || new Date();
    const hour = time.getHours();
    const dayOfWeek = time.getDay();
    
    // Weekend peak hours: 10 AM - 10 PM
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 10 && hour <= 22) {
        return this.peakHourMultiplier;
      }
    }
    
    // Weekday peak hours: 7-9 AM, 5-8 PM
    if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 20) {
      return this.peakHourMultiplier;
    }
    
    return 1.0;
  }

  /**
   * Get nearby drivers for a location
   */
  static async getNearbyDrivers(
    lat: number,
    lng: number,
    radius: number = 5 // km
  ) {
    try {
      // Get bounds for the search area
      const bounds = getBoundsOfDistance(
        { latitude: lat, longitude: lng },
        radius * 1000 // Convert km to meters
      );

      const drivers = await prisma.driver.findMany({
        where: {
          isActive: true,
          isOnline: true,
          isVerified: true,
          currentLatitude: {
            gte: bounds[0].latitude,
            lte: bounds[1].latitude
          },
          currentLongitude: {
            gte: bounds[0].longitude,
            lte: bounds[1].longitude
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          rating: 'desc'
        }
      });

      // Calculate exact distances and filter
      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.currentLatitude || !driver.currentLongitude) return false;
        
        const distance = this.calculateDistance(
          lat,
          lng,
          driver.currentLatitude,
          driver.currentLongitude
        );
        
        return distance <= radius;
      }).map(driver => ({
        ...driver,
        distance: this.calculateDistance(
          lat,
          lng,
          driver.currentLatitude!,
          driver.currentLongitude!
        )
      }));

      return nearbyDrivers.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      logger.error('Error getting nearby drivers:', error);
      throw new Error('Failed to get nearby drivers');
    }
  }

  /**
   * Update driver location
   */
  static async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
    heading?: number,
    speed?: number
  ) {
    try {
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLatitude: lat,
          currentLongitude: lng,
          lastActiveAt: new Date()
        }
      });

      logger.info(`Driver ${driverId} location updated`, { lat, lng, heading, speed });
    } catch (error) {
      logger.error('Error updating driver location:', error);
      throw new Error('Failed to update driver location');
    }
  }
}
