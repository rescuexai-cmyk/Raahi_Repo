import { database } from './database';
import { driverService, Driver } from './driverService.mobile';
import { LocationCoordinate } from './mapsService';
import * as rideService from './rideService';

export interface RideRequest {
  id: string;
  userId: string;
  pickupLocation: LocationCoordinate;
  destinationLocation: LocationCoordinate;
  pickupAddress: string;
  destinationAddress: string;
  rideType: string;
  estimatedFare: number;
  distance: number;
  estimatedDuration: number;
  status: 'searching' | 'driver_assigned' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  createdAt: Date;
  assignedDriverId?: string;
  currentDriverIndex: number;
  availableDrivers: string[]; // Array of driver IDs sorted by proximity
  requestAttempts: number;
  maxAttempts: number;
}

export interface DriverRequestAttempt {
  driverId: string;
  requestSentAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  responseTime?: number;
}

class RideRequestService {
  private activeRequests: Map<string, RideRequest> = new Map();
  private driverRequestTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds per driver
  private readonly MAX_TOTAL_ATTEMPTS = 5; // Try max 5 drivers
  private readonly OVERALL_TIMEOUT = 120000; // 2 minutes total search time

  /**
   * Initiate a ride request and start the driver selection process
   */
  async initiateRideRequest(
    userId: string,
    pickupLocation: LocationCoordinate,
    destinationLocation: LocationCoordinate,
    pickupAddress: string,
    destinationAddress: string,
    rideType: string,
    estimatedFare: number,
    distance: number,
    estimatedDuration: number
  ): Promise<{ success: boolean; requestId?: string; message?: string }> {
    try {
      console.log('🔍 Initiating ride request for user:', userId);

      // Find nearby available drivers
      const nearbyDrivers = await driverService.getNearbyDrivers(pickupLocation, 10000);
      
      if (nearbyDrivers.length === 0) {
        return {
          success: false,
          message: 'Sorry, no drivers are available in your area currently. Please try again later.'
        };
      }

      // Create ride request
      const requestId = `ride_request_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const rideRequest: RideRequest = {
        id: requestId,
        userId,
        pickupLocation,
        destinationLocation,
        pickupAddress,
        destinationAddress,
        rideType,
        estimatedFare,
        distance,
        estimatedDuration,
        status: 'searching',
        createdAt: new Date(),
        currentDriverIndex: 0,
        availableDrivers: nearbyDrivers
          .filter((driver: any) => driver.status === 'available')
          .sort((a: any, b: any) => (a.eta || 0) - (b.eta || 0)) // Sort by ETA
          .map((driver: any) => driver.id),
        requestAttempts: 0,
        maxAttempts: Math.min(this.MAX_TOTAL_ATTEMPTS, nearbyDrivers.length)
      };

      // Store active request
      this.activeRequests.set(requestId, rideRequest);

      // Start the driver selection process
      this.sendRequestToNextDriver(requestId);

      // Set overall timeout
      setTimeout(() => {
        this.handleOverallTimeout(requestId);
      }, this.OVERALL_TIMEOUT);

      console.log(`✅ Ride request initiated: ${requestId} with ${rideRequest.availableDrivers.length} available drivers`);

      return {
        success: true,
        requestId,
        message: `Searching for nearby drivers...`
      };

    } catch (error) {
      console.error('❌ Error initiating ride request:', error);
      return {
        success: false,
        message: 'Failed to initiate ride request. Please try again.'
      };
    }
  }

  /**
   * Send request to the next available driver in the queue
   */
  private async sendRequestToNextDriver(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      console.log('⚠️ Request not found:', requestId);
      return;
    }

    // Check if we've exhausted all drivers or attempts
    if (request.currentDriverIndex >= request.availableDrivers.length || 
        request.requestAttempts >= request.maxAttempts) {
      await this.handleNoDriversAvailable(requestId);
      return;
    }

    const driverId = request.availableDrivers[request.currentDriverIndex];
    request.requestAttempts++;

    console.log(`📱 Sending ride request to driver ${driverId} (attempt ${request.requestAttempts}/${request.maxAttempts})`);

    try {
      // Get driver details
      const driver = await driverService.getDriverById(driverId);
      if (!driver || driver.status !== 'available') {
        console.log(`⚠️ Driver ${driverId} not available, trying next driver`);
        request.currentDriverIndex++;
        this.sendRequestToNextDriver(requestId);
        return;
      }

      // Update driver status to busy (receiving request)
      await driverService.updateDriverStatus(driverId, 'busy');

      // Send request to driver (in real app, this would be via WebSocket/Push notification)
      await this.notifyDriver(driverId, request);

      // Set timeout for this specific driver
      const timeout = setTimeout(() => {
        this.handleDriverTimeout(requestId, driverId);
      }, this.REQUEST_TIMEOUT);

      this.driverRequestTimers.set(`${requestId}_${driverId}`, timeout);

      // Update request status
      request.status = 'driver_assigned';
      request.assignedDriverId = driverId;

      console.log(`⏰ Driver ${driverId} has ${this.REQUEST_TIMEOUT/1000} seconds to respond`);

    } catch (error) {
      console.error('❌ Error sending request to driver:', error);
      request.currentDriverIndex++;
      this.sendRequestToNextDriver(requestId);
    }
  }

  /**
   * Handle driver timeout - move to next driver
   */
  private async handleDriverTimeout(requestId: string, driverId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    console.log(`⏰ Driver ${driverId} didn't respond in time, trying next driver`);

    // Clear timeout
    const timeoutKey = `${requestId}_${driverId}`;
    const timeout = this.driverRequestTimers.get(timeoutKey);
    if (timeout) {
      clearTimeout(timeout);
      this.driverRequestTimers.delete(timeoutKey);
    }

    // Reset driver status to available
    try {
      await driverService.updateDriverStatus(driverId, 'available');
    } catch (error) {
      console.error('Error resetting driver status:', error);
    }

    // Move to next driver
    request.currentDriverIndex++;
    request.status = 'searching';
    request.assignedDriverId = undefined;

    // Send to next driver
    this.sendRequestToNextDriver(requestId);
  }

  /**
   * Handle driver accepting the ride request
   */
  async handleDriverAcceptance(requestId: string, driverId: string): Promise<{ success: boolean; message?: string }> {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return { success: false, message: 'Request not found' };
    }

    if (request.assignedDriverId !== driverId) {
      return { success: false, message: 'Request not assigned to this driver' };
    }

    console.log(`✅ Driver ${driverId} accepted ride request ${requestId}`);

    try {
      // Clear timeout
      const timeoutKey = `${requestId}_${driverId}`;
      const timeout = this.driverRequestTimers.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        this.driverRequestTimers.delete(timeoutKey);
      }

      // Update request status
      request.status = 'accepted';

      // Create ride in database
      const ride = await rideService.createRide({
        rider_id: request.userId,
        ride_type: request.rideType as 'economy' | 'comfort' | 'premium' | 'xl',
        pickup_location: {
          latitude: request.pickupLocation.lat,
          longitude: request.pickupLocation.lng
        },
        destination_location: {
          latitude: request.destinationLocation.lat,
          longitude: request.destinationLocation.lng
        },
        payment_method: 'cash' as const,
        fare: request.estimatedFare,
        distance: request.distance,
        estimated_duration: request.estimatedDuration
      });

      if (!ride || !ride.data) {
        throw new Error('Failed to create ride in database');
      }

      // Update driver status to on_ride
      await driverService.updateDriverStatus(driverId, 'on_ride');

      // Reset other drivers' status to available
      await this.resetOtherDriversStatus(request.availableDrivers, driverId);

      // Notify user about acceptance
      await this.notifyUserRideAccepted(request.userId, driverId, ride.data.id!);

      // Remove from active requests
      this.activeRequests.delete(requestId);

      console.log(`🎉 Ride ${ride.data.id} created successfully with driver ${driverId}`);

      return { 
        success: true, 
        message: `Driver accepted! Your ride is confirmed.` 
      };

    } catch (error) {
      console.error('❌ Error handling driver acceptance:', error);
      return { success: false, message: 'Failed to confirm ride' };
    }
  }

  /**
   * Handle driver declining the ride request
   */
  async handleDriverDecline(requestId: string, driverId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request || request.assignedDriverId !== driverId) {
      return;
    }

    console.log(`❌ Driver ${driverId} declined ride request ${requestId}`);

    try {
      // Clear timeout
      const timeoutKey = `${requestId}_${driverId}`;
      const timeout = this.driverRequestTimers.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        this.driverRequestTimers.delete(timeoutKey);
      }

      // Reset driver status to available
      await driverService.updateDriverStatus(driverId, 'available');

      // Move to next driver
      request.currentDriverIndex++;
      request.status = 'searching';
      request.assignedDriverId = undefined;

      // Try next driver
      this.sendRequestToNextDriver(requestId);

    } catch (error) {
      console.error('Error handling driver decline:', error);
    }
  }

  /**
   * Handle case when no drivers are available or all have declined
   */
  private async handleNoDriversAvailable(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    console.log(`😞 No drivers available for ride request ${requestId} after ${request.requestAttempts} attempts`);

    try {
      // Update request status
      request.status = 'expired';

      // Reset all drivers' status to available
      await this.resetOtherDriversStatus(request.availableDrivers);

      // Notify user
      await this.notifyUserNoDriversAvailable(request.userId);

      // Remove from active requests
      this.activeRequests.delete(requestId);

      console.log(`📱 User ${request.userId} notified: No rides available`);

    } catch (error) {
      console.error('Error handling no drivers available:', error);
    }
  }

  /**
   * Handle overall timeout for the entire request process
   */
  private async handleOverallTimeout(requestId: string): Promise<void> {
    const request = this.activeRequests.get(requestId);
    if (!request || request.status === 'accepted') {
      return; // Request already completed or accepted
    }

    console.log(`⏰ Overall timeout reached for ride request ${requestId}`);
    await this.handleNoDriversAvailable(requestId);
  }

  /**
   * Cancel an active ride request
   */
  async cancelRideRequest(requestId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const request = this.activeRequests.get(requestId);
    if (!request || request.userId !== userId) {
      return { success: false, message: 'Request not found' };
    }

    console.log(`🚫 User ${userId} cancelled ride request ${requestId}`);

    try {
      // Clear any active timeouts
      for (const [key, timeout] of this.driverRequestTimers.entries()) {
        if (key.startsWith(requestId)) {
          clearTimeout(timeout);
          this.driverRequestTimers.delete(key);
        }
      }

      // Reset drivers' status
      await this.resetOtherDriversStatus(request.availableDrivers);

      // Update request status
      request.status = 'cancelled';

      // Remove from active requests
      this.activeRequests.delete(requestId);

      return { success: true, message: 'Ride request cancelled successfully' };

    } catch (error) {
      console.error('Error cancelling ride request:', error);
      return { success: false, message: 'Failed to cancel ride request' };
    }
  }

  /**
   * Reset drivers' status to available (except excluded driver)
   */
  private async resetOtherDriversStatus(driverIds: string[], excludeDriverId?: string): Promise<void> {
    for (const driverId of driverIds) {
      if (driverId !== excludeDriverId) {
        try {
          await driverService.updateDriverStatus(driverId, 'available');
        } catch (error) {
          console.error(`Error resetting driver ${driverId} status:`, error);
        }
      }
    }
  }

  /**
   * Notify driver about ride request (in real app, this would be push notification)
   */
  private async notifyDriver(driverId: string, request: RideRequest): Promise<void> {
    console.log(`📱 [MOCK] Sending push notification to driver ${driverId}:`);
    console.log(`   Pickup: ${request.pickupAddress}`);
    console.log(`   Destination: ${request.destinationAddress}`);
    console.log(`   Fare: ₹${request.estimatedFare}`);
    console.log(`   Distance: ${request.distance} km`);
    
    // In production, this would be:
    // await pushNotificationService.sendToDriver(driverId, {
    //   type: 'ride_request',
    //   requestId: request.id,
    //   data: request
    // });
  }

  /**
   * Notify user about ride acceptance
   */
  private async notifyUserRideAccepted(userId: string, driverId: string, rideId: string): Promise<void> {
    console.log(`📱 [MOCK] Notifying user ${userId} about ride acceptance by driver ${driverId}`);
    
    // In production, this would be:
    // await pushNotificationService.sendToUser(userId, {
    //   type: 'ride_accepted',
    //   rideId: rideId,
    //   driverId: driverId
    // });
  }

  /**
   * Notify user that no drivers are available
   */
  private async notifyUserNoDriversAvailable(userId: string): Promise<void> {
    console.log(`📱 [MOCK] Notifying user ${userId}: Sorry, no rides are available currently`);
    
    // In production, this would be:
    // await pushNotificationService.sendToUser(userId, {
    //   type: 'no_drivers_available',
    //   message: 'Sorry, no rides are available currently. Please try again later.'
    // });
  }

  /**
   * Get active request status
   */
  getRequestStatus(requestId: string): RideRequest | null {
    return this.activeRequests.get(requestId) || null;
  }

  /**
   * Get all active requests (for debugging)
   */
  getActiveRequests(): RideRequest[] {
    return Array.from(this.activeRequests.values());
  }
}

export const rideRequestService = new RideRequestService();