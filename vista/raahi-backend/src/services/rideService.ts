import { prisma } from '@/database/connection';
import { logger } from '@/utils/logger';
import { PricingService } from './pricingService';
import { sendRideConfirmation, sendRideUpdate } from './smsService';
import { sendRideReceipt } from './emailService';
import { io } from '../index';

export interface CreateRideRequest {
  passengerId: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupAddress: string;
  dropAddress: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET';
  scheduledTime?: Date;
  vehicleType?: string;
}

export interface RideResponse {
  id: string;
  passengerId: string;
  driverId?: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupAddress: string;
  dropAddress: string;
  distance: number;
  duration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  totalFare: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  driver?: {
    id: string;
    firstName: string;
    lastName?: string;
    profileImage?: string;
    rating: number;
    vehicleNumber: string;
    vehicleModel: string;
    phone: string;
  };
}

export class RideService {
  /**
   * Create a new ride
   */
  static async createRide(request: CreateRideRequest): Promise<RideResponse> {
    try {
      // Calculate pricing
      const pricing = await PricingService.calculateFare({
        pickupLat: request.pickupLat,
        pickupLng: request.pickupLng,
        dropLat: request.dropLat,
        dropLng: request.dropLng,
        vehicleType: request.vehicleType,
        scheduledTime: request.scheduledTime
      });

      // Create ride
      const ride = await prisma.ride.create({
        data: {
          passengerId: request.passengerId,
          pickupLatitude: request.pickupLat,
          pickupLongitude: request.pickupLng,
          dropLatitude: request.dropLat,
          dropLongitude: request.dropLng,
          pickupAddress: request.pickupAddress,
          dropAddress: request.dropAddress,
          distance: pricing.distance,
          duration: pricing.estimatedDuration,
          baseFare: pricing.baseFare,
          distanceFare: pricing.distanceFare,
          timeFare: pricing.timeFare,
          surgeMultiplier: pricing.surgeMultiplier,
          totalFare: pricing.totalFare,
          paymentMethod: request.paymentMethod,
          scheduledAt: request.scheduledTime
        }
      });

      logger.info(`Ride created: ${ride.id} for passenger ${request.passengerId}`);

      // Find nearby drivers
      const nearbyDrivers = await PricingService.getNearbyDrivers(
        request.pickupLat,
        request.pickupLng,
        5 // 5km radius
      );

      // Emit event to find drivers
      io.emit('ride-request', {
        rideId: ride.id,
        pickupLat: request.pickupLat,
        pickupLng: request.pickupLng,
        dropLat: request.dropLat,
        dropLng: request.dropLng,
        totalFare: pricing.totalFare,
        nearbyDrivers: nearbyDrivers.length
      });

      return this.formatRideResponse(ride);
    } catch (error) {
      logger.error('Error creating ride:', error);
      throw new Error('Failed to create ride');
    }
  }

  /**
   * Assign driver to ride
   */
  static async assignDriver(rideId: string, driverId: string): Promise<RideResponse> {
    try {
      const ride = await prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          status: 'DRIVER_ASSIGNED'
        },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      // Get passenger details for SMS
      const passenger = await prisma.user.findUnique({
        where: { id: ride.passengerId }
      });

      if (passenger && ride.driver) {
        // Send confirmation SMS
        const estimatedArrival = '5-10 minutes'; // This would be calculated based on driver location
        await sendRideConfirmation(
          passenger.phone,
          `${ride.driver.user.firstName} ${ride.driver.user.lastName || ''}`.trim(),
          ride.driver.user.phone,
          ride.driver.vehicleNumber || '',
          estimatedArrival
        );
      }

      // Emit real-time update
      io.to(`ride-${rideId}`).emit('driver-assigned', {
        rideId,
        driver: {
          id: ride.driver?.id,
          name: `${ride.driver?.user.firstName} ${ride.driver?.user.lastName || ''}`.trim(),
          phone: ride.driver?.user.phone,
          vehicleNumber: ride.driver?.vehicleNumber,
          vehicleModel: ride.driver?.vehicleModel,
          rating: ride.driver?.rating,
          profileImage: ride.driver?.user.profileImage
        }
      });

      logger.info(`Driver ${driverId} assigned to ride ${rideId}`);

      return this.formatRideResponse(ride);
    } catch (error) {
      logger.error('Error assigning driver:', error);
      throw new Error('Failed to assign driver');
    }
  }

  /**
   * Update ride status
   */
  static async updateRideStatus(
    rideId: string,
    status: 'CONFIRMED' | 'DRIVER_ARRIVED' | 'RIDE_STARTED' | 'RIDE_COMPLETED' | 'CANCELLED',
    driverId?: string,
    cancellationReason?: string
  ): Promise<RideResponse> {
    try {
      const updateData: any = { status };

      if (status === 'RIDE_STARTED') {
        updateData.startedAt = new Date();
      } else if (status === 'RIDE_COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = cancellationReason;
      }

      const ride = await prisma.ride.update({
        where: { id: rideId },
        data: updateData,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      // Emit real-time update
      io.to(`ride-${rideId}`).emit('ride-status-update', {
        rideId,
        status,
        timestamp: new Date().toISOString()
      });

      // Send SMS updates
      const passenger = await prisma.user.findUnique({
        where: { id: ride.passengerId }
      });

      if (passenger) {
        let message = '';
        switch (status) {
          case 'CONFIRMED':
            message = 'Your ride has been confirmed. Driver is on the way.';
            break;
          case 'DRIVER_ARRIVED':
            message = 'Your driver has arrived at the pickup location.';
            break;
          case 'RIDE_STARTED':
            message = 'Your ride has started. Have a safe journey!';
            break;
          case 'RIDE_COMPLETED':
            message = 'Your ride has been completed. Thank you for choosing Raahi!';
            // Send receipt email if passenger has email
            if (passenger.email) {
              await sendRideReceipt(passenger.email, {
                rideId: ride.id,
                pickupAddress: ride.pickupAddress,
                dropAddress: ride.dropAddress,
                distance: ride.distance,
                duration: ride.duration,
                totalFare: ride.totalFare,
                paymentMethod: ride.paymentMethod,
                driverName: ride.driver ? `${ride.driver.user.firstName} ${ride.driver.user.lastName || ''}`.trim() : 'Unknown',
                vehicleNumber: ride.driver?.vehicleNumber || 'Unknown',
                completedAt: ride.completedAt || new Date()
              });
            }
            break;
          case 'CANCELLED':
            message = `Your ride has been cancelled. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`;
            break;
        }

        if (message) {
          await sendRideUpdate(passenger.phone, message);
        }
      }

      logger.info(`Ride ${rideId} status updated to ${status}`);

      return this.formatRideResponse(ride);
    } catch (error) {
      logger.error('Error updating ride status:', error);
      throw new Error('Failed to update ride status');
    }
  }

  /**
   * Get ride by ID
   */
  static async getRideById(rideId: string): Promise<RideResponse | null> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      if (!ride) {
        return null;
      }

      return this.formatRideResponse(ride);
    } catch (error) {
      logger.error('Error getting ride by ID:', error);
      throw new Error('Failed to get ride');
    }
  }

  /**
   * Get user's rides
   */
  static async getUserRides(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ rides: RideResponse[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [rides, total] = await Promise.all([
        prisma.ride.findMany({
          where: { passengerId: userId },
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImage: true,
                    phone: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.ride.count({
          where: { passengerId: userId }
        })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        rides: rides.map(ride => this.formatRideResponse(ride)),
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error getting user rides:', error);
      throw new Error('Failed to get user rides');
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
  ): Promise<void> {
    try {
      await PricingService.updateDriverLocation(driverId, lat, lng, heading, speed);

      // Get active rides for this driver
      const activeRides = await prisma.ride.findMany({
        where: {
          driverId,
          status: {
            in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED']
          }
        }
      });

      // Emit location updates for each active ride
      activeRides.forEach(ride => {
        io.to(`ride-${ride.id}`).emit('driver-location-update', {
          rideId: ride.id,
          lat,
          lng,
          heading,
          speed,
          timestamp: new Date().toISOString()
        });
      });

      logger.info(`Driver ${driverId} location updated`, { lat, lng, activeRides: activeRides.length });
    } catch (error) {
      logger.error('Error updating driver location:', error);
      throw new Error('Failed to update driver location');
    }
  }

  /**
   * Cancel ride
   */
  static async cancelRide(
    rideId: string,
    cancelledBy: 'passenger' | 'driver',
    reason?: string
  ): Promise<RideResponse> {
    try {
      const ride = await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason || `Cancelled by ${cancelledBy}`
        },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      // Emit cancellation event
      io.to(`ride-${rideId}`).emit('ride-cancelled', {
        rideId,
        cancelledBy,
        reason,
        timestamp: new Date().toISOString()
      });

      logger.info(`Ride ${rideId} cancelled by ${cancelledBy}`);

      return this.formatRideResponse(ride);
    } catch (error) {
      logger.error('Error cancelling ride:', error);
      throw new Error('Failed to cancel ride');
    }
  }

  /**
   * Format ride response
   */
  private static formatRideResponse(ride: any): RideResponse {
    return {
      id: ride.id,
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      pickupLat: ride.pickupLatitude,
      pickupLng: ride.pickupLongitude,
      dropLat: ride.dropLatitude,
      dropLng: ride.dropLongitude,
      pickupAddress: ride.pickupAddress,
      dropAddress: ride.dropAddress,
      distance: ride.distance,
      duration: ride.duration,
      baseFare: ride.baseFare,
      distanceFare: ride.distanceFare,
      timeFare: ride.timeFare,
      surgeMultiplier: ride.surgeMultiplier,
      totalFare: ride.totalFare,
      status: ride.status,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      scheduledAt: ride.scheduledAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      cancellationReason: ride.cancellationReason,
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
      driver: ride.driver ? {
        id: ride.driver.id,
        firstName: ride.driver.user.firstName,
        lastName: ride.driver.user.lastName,
        profileImage: ride.driver.user.profileImage,
        rating: ride.driver.rating,
        vehicleNumber: ride.driver.vehicleNumber,
        vehicleModel: ride.driver.vehicleModel,
        phone: ride.driver.user.phone
      } : undefined
    };
  }
}
