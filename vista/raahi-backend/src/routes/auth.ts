import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', [
  body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
  body('countryCode').optional().isString().withMessage('Country code must be string')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { phone, countryCode = '+91' } = req.body;

  try {
    const result = await AuthService.sendMobileOTP(phone, countryCode);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
}));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and authenticate user
 * @access  Public
 */
router.post('/verify-otp', [
  body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits'),
  body('countryCode').optional().isString().withMessage('Country code must be string')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { phone, otp, countryCode = '+91' } = req.body;

  try {
    const result = await AuthService.verifyMobileOTP(phone, otp, countryCode);
    
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: result
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'OTP verification failed'
    });
  }
}));

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate with Google
 * @access  Public
 */
router.post('/google', [
  body('idToken').isString().withMessage('Google ID token required')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { idToken } = req.body;

  try {
    const result = await AuthService.authenticateWithGoogle(idToken);
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: result
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Google authentication failed'
    });
  }
}));

/**
 * @route   POST /api/auth/truecaller
 * @desc    Authenticate with Truecaller
 * @access  Public
 */
router.post('/truecaller', [
  body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
  body('truecallerToken').isString().withMessage('Truecaller token required')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { phone, truecallerToken } = req.body;

  try {
    const result = await AuthService.authenticateWithTruecaller(phone, truecallerToken);
    
    res.status(200).json({
      success: true,
      message: 'Truecaller authentication successful',
      data: result
    });
  } catch (error) {
    logger.error('Truecaller auth error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Truecaller authentication failed'
    });
  }
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', [
  body('refreshToken').isString().withMessage('Refresh token required')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { refreshToken } = req.body;

  try {
    const result = await AuthService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, [
  body('refreshToken').isString().withMessage('Refresh token required')
], asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { refreshToken } = req.body;

  try {
    await AuthService.logout(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await AuthService.getUserProfile(req.user!.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, [
  body('firstName').optional().isString().withMessage('First name must be string'),
  body('lastName').optional().isString().withMessage('Last name must be string'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('profileImage').optional().isString().withMessage('Profile image must be string')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  const { firstName, lastName, email, profileImage } = req.body;

  try {
    const user = await AuthService.updateUserProfile(req.user!.id, {
      firstName,
      lastName,
      email,
      profileImage
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
}));

export default router;
