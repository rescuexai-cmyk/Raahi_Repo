import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PricingService } from '../services/pricingService';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * @route   POST /api/pricing/calculate
 * @desc    Calculate fare for a ride
 * @access  Public
 */
router.post('/calculate', [
  body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Valid pickup latitude required'),
  body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Valid pickup longitude required'),
  body('dropLat').isFloat({ min: -90, max: 90 }).withMessage('Valid drop latitude required'),
  body('dropLng').isFloat({ min: -180, max: 180 }).withMessage('Valid drop longitude required'),
  body('vehicleType').optional().isString().withMessage('Vehicle type must be string'),
  body('scheduledTime').optional().isISO8601().withMessage('Valid scheduled time required')
], optionalAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { pickupLat, pickupLng, dropLat, dropLng, vehicleType, scheduledTime } = req.body;

  try {
    const pricing = await PricingService.calculateFare({
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      vehicleType,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
    });

    res.status(200).json({
      success: true,
      data: pricing
    });
  } catch (error) {
    logger.error('Pricing calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate pricing'
    });
  }
}));

/**
 * @route   GET /api/pricing/nearby-drivers
 * @desc    Get nearby drivers for a location
 * @access  Public
 */
router.get('/nearby-drivers', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isFloat({ min: 1, max: 50 }).withMessage('Radius must be between 1-50 km')
], optionalAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { lat, lng, radius = 5 } = req.query;

  try {
    const drivers = await PricingService.getNearbyDrivers(
      parseFloat(lat as string), 
      parseFloat(lng as string), 
      parseFloat(radius as string)
    );

    res.status(200).json({
      success: true,
      data: {
        drivers,
        count: drivers.length,
        radius
      }
    });
  } catch (error) {
    logger.error('Get nearby drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby drivers'
    });
  }
}));

/**
 * @route   GET /api/pricing/surge-areas
 * @desc    Get current surge areas
 * @access  Public
 */
router.get('/surge-areas', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { prisma } = await import('@/database/connection');
    
    const surgeAreas = await prisma.surgeArea.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        centerLatitude: true,
        centerLongitude: true,
        radius: true,
        multiplier: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        surgeAreas,
        count: surgeAreas.length
      }
    });
  } catch (error) {
    logger.error('Get surge areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get surge areas'
    });
  }
}));

/**
 * @route   GET /api/pricing/rules
 * @desc    Get current pricing rules
 * @access  Public
 */
router.get('/rules', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('@/database/connection');
    
    const now = new Date();
    const pricingRule = await prisma.pricingRule.findFirst({
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

    if (!pricingRule) {
      // Return default pricing
      res.status(200).json({
        success: true,
        data: {
          baseFare: parseFloat(process.env.BASE_FARE || '25'),
          perKmRate: parseFloat(process.env.PER_KM_RATE || '12'),
          perMinuteRate: parseFloat(process.env.PER_MINUTE_RATE || '2'),
          surgeMultiplier: 1.0,
          peakHourMultiplier: 1.0
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: pricingRule
    });
  } catch (error) {
    logger.error('Get pricing rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing rules'
    });
  }
}));

export default router;
