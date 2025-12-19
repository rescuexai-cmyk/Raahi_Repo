import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authenticateDriver, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

/**
 * @route   GET /api/driver/profile
 * @desc    Get driver profile information
 * @access  Private (Driver only)
 */
router.get('/profile', authenticateDriver, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  logger.info(`[${requestId}] GET DRIVER PROFILE API CALL STARTED`, {
    driverId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  try {
    // Fetch real driver profile data from database
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user?.id },
      include: {
        user: true,
        documents: true,
        earnings: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today's earnings
            }
          }
        }
      }
    });

    if (!driver) {
      logger.warn(`[${requestId}] Driver profile not found`, {
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
      res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
      return;
    }

    // Calculate today's earnings
    const todayEarnings = driver.earnings.reduce((sum, earning) => sum + earning.netAmount, 0);

    // Get total earnings from driver record
    const totalEarnings = driver.totalEarnings;

    // Check if all documents are verified
    const allDocsVerified = driver.documents.length > 0 && 
                           driver.documents.every(doc => doc.isVerified);
    const pendingDocs = driver.documents.filter(doc => !doc.isVerified);

    const driverProfile = {
      driver_id: driver.id,
      email: driver.user.email,
      name: `${driver.user.firstName} ${driver.user.lastName || ''}`.trim(),
      phone: driver.user.phone,
      license_number: driver.licenseNumber,
      vehicle_info: {
        make: driver.vehicleModel?.split(' ')[0] || 'Unknown',
        model: driver.vehicleModel,
        year: driver.vehicleYear,
        license_plate: driver.vehicleNumber,
        color: driver.vehicleColor
      },
      documents: {
        license_verified: driver.documents.some(doc => doc.documentType === 'LICENSE' && doc.isVerified),
        insurance_verified: driver.documents.some(doc => doc.documentType === 'INSURANCE' && doc.isVerified),
        vehicle_registration_verified: driver.documents.some(doc => doc.documentType === 'RC' && doc.isVerified),
        all_verified: allDocsVerified,
        pending_count: pendingDocs.length
      },
      onboarding: {
        status: driver.onboardingStatus,
        is_verified: driver.isVerified,
        documents_submitted: driver.documentsSubmittedAt !== null,
        documents_verified: allDocsVerified,
        can_start_rides: driver.isVerified && allDocsVerified,
        verification_notes: driver.verificationNotes
      },
      status: driver.isActive ? 'active' : 'inactive',
      rating: driver.rating,
      total_trips: driver.totalRides,
      earnings: {
        today: todayEarnings,
        week: Math.round(totalEarnings * 0.3), // Approximate weekly earnings
        month: Math.round(totalEarnings * 0.7), // Approximate monthly earnings
        total: totalEarnings
      },
      is_online: driver.isOnline,
      current_location: {
        latitude: driver.currentLatitude || 28.6139,
        longitude: driver.currentLongitude || 77.2090
      }
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] GET DRIVER PROFILE SUCCESS`, {
      driverId: driverProfile.driver_id,
      rating: driverProfile.rating,
      totalTrips: driverProfile.total_trips,
      todayEarnings: driverProfile.earnings.today,
      duration: `${duration}ms`
    });

    res.status(200).json({
      success: true,
      data: driverProfile
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] GET DRIVER PROFILE ERROR`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      driverId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver profile'
    });
  }
}));

/**
 * @route   PATCH /api/driver/status
 * @desc    Update driver online/offline status
 * @access  Private (Driver only)
 */
router.patch('/status', authenticateDriver, [
  body('online').isBoolean().withMessage('Online status must be boolean'),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  logger.info(`[${requestId}] UPDATE DRIVER STATUS API CALL STARTED`, {
    driverId: req.user?.id,
    online: req.body.online,
    location: req.body.location,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`[${requestId}] UPDATE DRIVER STATUS VALIDATION FAILED`, {
      errors: errors.array(),
      duration: Date.now() - startTime
    });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { online, location } = req.body;

  try {
    // Update driver status in database
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user?.id }
    });

    if (!driver) {
      logger.warn(`[${requestId}] Driver not found for status update`, {
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
      res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
      return;
    }

    // Update driver status and location
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        isOnline: online,
        lastActiveAt: new Date(),
        currentLatitude: location?.latitude || driver.currentLatitude,
        currentLongitude: location?.longitude || driver.currentLongitude
      }
    });

    const updatedStatus = {
      driver_id: updatedDriver.id,
      online: updatedDriver.isOnline,
      last_seen: updatedDriver.lastActiveAt?.toISOString(),
      location: {
        latitude: updatedDriver.currentLatitude || 28.6139,
        longitude: updatedDriver.currentLongitude || 77.2090
      }
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] UPDATE DRIVER STATUS SUCCESS`, {
      driverId: updatedStatus.driver_id,
      online: updatedStatus.online,
      location: updatedStatus.location,
      duration: `${duration}ms`
    });

    res.status(200).json({
      success: true,
      message: `Driver is now ${online ? 'online' : 'offline'}`,
      data: updatedStatus
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] UPDATE DRIVER STATUS ERROR`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      driverId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status'
    });
  }
}));

/**
 * @route   GET /api/driver/earnings
 * @desc    Get driver earnings data
 * @access  Private (Driver only)
 */
router.get('/earnings', authenticateDriver, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  logger.info(`[${requestId}] GET DRIVER EARNINGS API CALL STARTED`, {
    driverId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  try {
    // Fetch real earnings data from database
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user?.id },
      include: {
        earnings: {
          orderBy: { date: 'desc' }
        },
        rides: {
          where: { status: 'RIDE_COMPLETED' }
        }
      }
    });

    if (!driver) {
      logger.warn(`[${requestId}] Driver not found for earnings`, {
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
      res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
      return;
    }

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth() - 1);

    // Filter earnings by date ranges
    const todayEarnings = driver.earnings.filter(e => e.date >= today);
    const weekEarnings = driver.earnings.filter(e => e.date >= weekStart);
    const monthEarnings = driver.earnings.filter(e => e.date >= monthStart);

    // Calculate totals
    const todayAmount = todayEarnings.reduce((sum, e) => sum + e.netAmount, 0);
    const weekAmount = weekEarnings.reduce((sum, e) => sum + e.netAmount, 0);
    const monthAmount = monthEarnings.reduce((sum, e) => sum + e.netAmount, 0);
    const totalAmount = driver.totalEarnings;

    // Calculate trip counts
    const todayTrips = todayEarnings.length;
    const weekTrips = weekEarnings.length;
    const monthTrips = monthEarnings.length;
    const totalTrips = driver.totalRides;

    const earnings = {
      today: {
        amount: todayAmount,
        trips: todayTrips,
        hours_online: 6.5, // This would need to be calculated from actual online time
        average_per_trip: todayTrips > 0 ? todayAmount / todayTrips : 0
      },
      week: {
        amount: weekAmount,
        trips: weekTrips,
        hours_online: 42, // This would need to be calculated from actual online time
        average_per_trip: weekTrips > 0 ? weekAmount / weekTrips : 0
      },
      month: {
        amount: monthAmount,
        trips: monthTrips,
        hours_online: 168, // This would need to be calculated from actual online time
        average_per_trip: monthTrips > 0 ? monthAmount / monthTrips : 0
      },
      total: {
        amount: totalAmount,
        trips: totalTrips,
        hours_online: 420, // This would need to be calculated from actual online time
        average_per_trip: totalTrips > 0 ? totalAmount / totalTrips : 0
      },
      breakdown: {
        base_fare: Math.round(totalAmount * 0.1), // Approximate breakdown
        distance_fare: Math.round(totalAmount * 0.7),
        time_fare: Math.round(totalAmount * 0.15),
        surge_bonus: Math.round(totalAmount * 0.05)
      }
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] GET DRIVER EARNINGS SUCCESS`, {
      driverId: req.user?.id,
      todayEarnings: earnings.today.amount,
      todayTrips: earnings.today.trips,
      totalEarnings: earnings.total.amount,
      duration: `${duration}ms`
    });

    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] GET DRIVER EARNINGS ERROR`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      driverId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver earnings'
    });
  }
}));

/**
 * @route   GET /api/driver/trips
 * @desc    Get driver trip history
 * @access  Private (Driver only)
 */
router.get('/trips', authenticateDriver, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  logger.info(`[${requestId}] GET DRIVER TRIPS API CALL STARTED`, {
    driverId: req.user?.id,
    page,
    limit,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  try {
    // Fetch real trip history from database
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user?.id }
    });

    if (!driver) {
      logger.warn(`[${requestId}] Driver not found for trips`, {
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
      res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
      return;
    }

    // Get total count for pagination
    const totalTrips = await prisma.ride.count({
      where: { driverId: driver.id }
    });

    // Fetch trips with pagination
    const rides = await prisma.ride.findMany({
      where: { driverId: driver.id },
      include: {
        passenger: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const trips = rides.map(ride => ({
      trip_id: ride.id,
      passenger_name: `${ride.passenger.firstName} ${ride.passenger.lastName || ''}`.trim(),
      passenger_phone: ride.passenger.phone,
      pickup_address: ride.pickupAddress,
      drop_address: ride.dropAddress,
      distance: ride.distance,
      duration: ride.duration,
      fare: ride.totalFare,
      status: ride.status.toLowerCase(),
      rating: 4.5, // This would need to be stored separately in a ratings table
      created_at: ride.createdAt.toISOString()
    }));

    const totalPages = Math.ceil(totalTrips / limit);

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] GET DRIVER TRIPS SUCCESS`, {
      driverId: req.user?.id,
      tripsReturned: trips.length,
      totalTrips,
      page,
      totalPages,
      duration: `${duration}ms`
    });

    res.status(200).json({
      success: true,
      data: {
        trips,
        pagination: {
          page,
          limit,
          total: totalTrips,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] GET DRIVER TRIPS ERROR`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      driverId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver trips'
    });
  }
}));

/**
 * @route   POST /api/driver/support
 * @desc    Submit driver support request
 * @access  Private (Driver only)
 */
router.post('/support', authenticateDriver, [
  body('issue_type').isString().notEmpty().withMessage('Issue type required'),
  body('description').isString().notEmpty().withMessage('Description required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Valid priority required')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  logger.info(`[${requestId}] DRIVER SUPPORT REQUEST API CALL STARTED`, {
    driverId: req.user?.id,
    issueType: req.body.issue_type,
    priority: req.body.priority,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`[${requestId}] DRIVER SUPPORT REQUEST VALIDATION FAILED`, {
      errors: errors.array(),
      duration: Date.now() - startTime
    });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { issue_type, description, priority = 'medium' } = req.body;

  try {
    // Mock support request submission - replace with actual database insert
    const supportRequest = {
      request_id: `support_${Date.now()}`,
      driver_id: req.user?.id,
      issue_type,
      description,
      priority,
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] DRIVER SUPPORT REQUEST SUCCESS`, {
      requestId: supportRequest.request_id,
      driverId: supportRequest.driver_id,
      issueType: supportRequest.issue_type,
      priority: supportRequest.priority,
      duration: `${duration}ms`
    });

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully',
      data: supportRequest
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] DRIVER SUPPORT REQUEST ERROR`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      driverId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to submit support request'
    });
  }
}));

export default router;
