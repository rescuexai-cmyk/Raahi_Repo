import express, { Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { RealTimeService } from '../services/realTimeService';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * @route   GET /api/realtime/stats
 * @desc    Get real-time statistics
 * @access  Public
 */
router.get('/stats', optionalAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await RealTimeService.getRealTimeStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get real-time stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time statistics'
    });
  }
}));

/**
 * @route   GET /api/realtime/location-stats
 * @desc    Get location-specific statistics
 * @access  Public
 */
router.get('/location-stats', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1-50 km')
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

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 5;

  try {
    const stats = await RealTimeService.getLocationStats(lat, lng, radius);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get location stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location statistics'
    });
  }
}));

/**
 * @route   POST /api/realtime/update-driver-location
 * @desc    Update driver location
 * @access  Private (Driver only)
 */
router.post('/update-driver-location', [
  body('driverId').isString().notEmpty().withMessage('Driver ID required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Valid heading required'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Valid speed required')
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

  const { driverId, lat, lng, heading, speed } = req.body;

  try {
    await RealTimeService.updateDriverLocation(driverId, lat, lng, heading, speed);
    
    res.status(200).json({
      success: true,
      message: 'Driver location updated successfully'
    });
  } catch (error) {
    logger.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver location'
    });
  }
}));

/**
 * @route   GET /api/realtime/driver-heatmap
 * @desc    Get driver heatmap data
 * @access  Public
 */
router.get('/driver-heatmap', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const heatmapData = await RealTimeService.getDriverHeatmapData();
    
    res.status(200).json({
      success: true,
      data: heatmapData
    });
  } catch (error) {
    logger.error('Get driver heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver heatmap data'
    });
  }
}));

/**
 * @route   GET /api/realtime/demand-hotspots
 * @desc    Get demand hotspots
 * @access  Public
 */
router.get('/demand-hotspots', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const hotspots = await RealTimeService.getDemandHotspots();
    
    res.status(200).json({
      success: true,
      data: hotspots
    });
  } catch (error) {
    logger.error('Get demand hotspots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get demand hotspots'
    });
  }
}));

export default router;
