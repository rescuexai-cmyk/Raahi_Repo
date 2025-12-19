import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PrismaClient, OnboardingStatus } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/driver-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
    }
  }
});

/**
 * @route   POST /api/driver/onboarding/start
 * @desc    Start driver onboarding process
 * @access  Private
 */
router.post('/start', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] START DRIVER ONBOARDING`, { userId: req.user?.id });

  try {
    // Check if driver profile already exists
    let driver = await prisma.driver.findFirst({
      where: { userId: req.user?.id }
    });

    if (driver) {
      logger.info(`[${requestId}] Driver profile exists`, {
        driverId: driver.id,
        onboardingStatus: driver.onboardingStatus
      });

      res.json({
        success: true,
        message: 'Driver profile found',
        data: {
          driver_id: driver.id,
          onboarding_status: driver.onboardingStatus,
          current_step: driver.onboardingStatus
        }
      });
      return;
    }

    // Create new driver profile
    driver = await prisma.driver.create({
      data: {
        userId: req.user!.id,
        onboardingStatus: OnboardingStatus.EMAIL_COLLECTION
      }
    });

    logger.info(`[${requestId}] Driver profile created`, { driverId: driver.id });

    res.status(201).json({
      success: true,
      message: 'Driver onboarding started',
      data: {
        driver_id: driver.id,
        onboarding_status: driver.onboardingStatus,
        current_step: 'EMAIL_COLLECTION'
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error starting onboarding`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to start onboarding',
      error: error.message
    });
  }
}));

/**
 * @route   PUT /api/driver/onboarding/language
 * @desc    Update driver language preference
 * @access  Private
 */
router.put('/language', [
  authenticate,
  body('language').notEmpty().withMessage('Language is required')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { language } = req.body;
  logger.info(`[${requestId}] UPDATE LANGUAGE`, { userId: req.user?.id, language });

  try {
    const driver = await prisma.driver.update({
      where: { userId: req.user!.id },
      data: {
        preferredLanguage: language,
        onboardingStatus: OnboardingStatus.EARNING_SETUP
      }
    });

    logger.info(`[${requestId}] Language updated`, { driverId: driver.id });

    res.json({
      success: true,
      message: 'Language preference saved',
      data: {
        driver_id: driver.id,
        language: driver.preferredLanguage,
        next_step: 'EARNING_SETUP'
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error updating language`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to save language preference',
      error: error.message
    });
  }
}));

/**
 * @route   PUT /api/driver/onboarding/vehicle
 * @desc    Update driver vehicle selection
 * @access  Private
 */
router.put('/vehicle', [
  authenticate,
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('serviceTypes').isArray().withMessage('Service types must be an array')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { vehicleType, serviceTypes } = req.body;
  logger.info(`[${requestId}] UPDATE VEHICLE`, { userId: req.user?.id, vehicleType, serviceTypes });

  try {
    const driver = await prisma.driver.update({
      where: { userId: req.user!.id },
      data: {
        vehicleType,
        serviceTypes,
        onboardingStatus: OnboardingStatus.LICENSE_UPLOAD
      }
    });

    logger.info(`[${requestId}] Vehicle updated`, { driverId: driver.id });

    res.json({
      success: true,
      message: 'Vehicle information saved',
      data: {
        driver_id: driver.id,
        vehicle_type: driver.vehicleType,
        service_types: driver.serviceTypes,
        next_step: 'LICENSE_UPLOAD'
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error updating vehicle`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to save vehicle information',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/driver/onboarding/document/upload
 * @desc    Upload driver document
 * @access  Private
 */
router.post('/document/upload', [
  authenticate,
  upload.single('document')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] UPLOAD DOCUMENT`, { userId: req.user?.id });

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
      return;
    }

    // Get driver profile
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.id }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
      return;
    }

    // Save document to database
    const document = await prisma.driverDocument.create({
      data: {
        driverId: driver.id,
        documentType: documentType.toUpperCase(),
        documentUrl: `/uploads/driver-documents/${req.file.filename}`,
        documentName: req.file.originalname,
        documentSize: req.file.size
      }
    });

    // Update driver onboarding status based on document type
    let newStatus = driver.onboardingStatus;
    if (documentType === 'LICENSE') {
      newStatus = OnboardingStatus.PROFILE_PHOTO;
    } else if (documentType === 'PROFILE_PHOTO') {
      newStatus = OnboardingStatus.PHOTO_CONFIRMATION;
    }

    await prisma.driver.update({
      where: { id: driver.id },
      data: { onboardingStatus: newStatus }
    });

    logger.info(`[${requestId}] Document uploaded`, {
      driverId: driver.id,
      documentId: document.id,
      documentType
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document_id: document.id,
        document_type: document.documentType,
        document_url: document.documentUrl,
        uploaded_at: document.uploadedAt,
        next_step: newStatus
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error uploading document`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/driver/onboarding/documents/submit
 * @desc    Submit all documents for verification
 * @access  Private
 */
router.post('/documents/submit', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] SUBMIT DOCUMENTS FOR VERIFICATION`, { userId: req.user?.id });

  try {
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.id },
      include: { documents: true }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
      return;
    }

    // Check if all required documents are uploaded
    const requiredDocs = ['LICENSE', 'PAN_CARD', 'RC', 'AADHAAR_CARD', 'PROFILE_PHOTO'];
    const uploadedDocs = driver.documents.map(doc => doc.documentType);
    const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc as any));

    if (missingDocs.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Missing required documents',
        data: {
          missing_documents: missingDocs
        }
      });
      return;
    }

    // Update driver status to verification pending
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        onboardingStatus: OnboardingStatus.DOCUMENT_VERIFICATION,
        documentsSubmittedAt: new Date()
      }
    });

    logger.info(`[${requestId}] Documents submitted for verification`, { driverId: driver.id });

    res.json({
      success: true,
      message: 'Documents submitted for verification',
      data: {
        driver_id: driver.id,
        status: 'DOCUMENT_VERIFICATION',
        submitted_at: new Date(),
        estimated_verification_time: '24-48 hours'
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error submitting documents`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to submit documents',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/driver/onboarding/status
 * @desc    Get driver onboarding status
 * @access  Private
 */
router.get('/status', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] GET ONBOARDING STATUS`, { userId: req.user?.id });

  try {
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.id },
      include: {
        documents: true,
        user: true
      }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
      return;
    }

    // Check document verification status
    const allDocsVerified = driver.documents.length > 0 && 
                           driver.documents.every(doc => doc.isVerified);
    
    const pendingDocs = driver.documents.filter(doc => !doc.isVerified);

    res.json({
      success: true,
      data: {
        driver_id: driver.id,
        onboarding_status: driver.onboardingStatus,
        current_step: driver.onboardingStatus,
        is_verified: driver.isVerified,
        documents_submitted: driver.documentsSubmittedAt !== null,
        documents_verified: allDocsVerified,
        pending_documents: pendingDocs.map(doc => ({
          type: doc.documentType,
          uploaded_at: doc.uploadedAt
        })),
        can_start_rides: driver.isVerified && allDocsVerified,
        verification_notes: driver.verificationNotes
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error getting onboarding status`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get onboarding status',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/driver/onboarding/verify
 * @desc    Verify driver documents (Admin only)
 * @access  Private (Admin)
 */
router.post('/verify', [
  authenticate,
  body('driverId').notEmpty().withMessage('Driver ID is required'),
  body('approved').isBoolean().withMessage('Approval status is required')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { driverId, approved, notes } = req.body;
  logger.info(`[${requestId}] VERIFY DRIVER DOCUMENTS`, {
    adminId: req.user?.id,
    driverId,
    approved
  });

  try {
    // TODO: Add admin role check here
    // if (req.user?.role !== 'ADMIN') {
    //   res.status(403).json({ success: false, message: 'Unauthorized' });
    //   return;
    // }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { documents: true }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
      return;
    }

    if (approved) {
      // Approve all documents
      await prisma.driverDocument.updateMany({
        where: { driverId: driver.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: req.user!.id
        }
      });

      // Update driver status
      await prisma.driver.update({
        where: { id: driver.id },
        data: {
          isVerified: true,
          onboardingStatus: OnboardingStatus.COMPLETED,
          documentsVerifiedAt: new Date(),
          verificationNotes: notes || 'All documents verified successfully'
        }
      });

      logger.info(`[${requestId}] Driver verified successfully`, { driverId: driver.id });

      res.json({
        success: true,
        message: 'Driver verified successfully',
        data: {
          driver_id: driver.id,
          status: 'COMPLETED',
          verified_at: new Date()
        }
      });
    } else {
      // Reject verification
      await prisma.driver.update({
        where: { id: driver.id },
        data: {
          onboardingStatus: OnboardingStatus.REJECTED,
          verificationNotes: notes || 'Documents rejected. Please resubmit.'
        }
      });

      logger.info(`[${requestId}] Driver verification rejected`, { driverId: driver.id });

      res.json({
        success: true,
        message: 'Driver verification rejected',
        data: {
          driver_id: driver.id,
          status: 'REJECTED',
          notes: notes
        }
      });
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Error verifying driver`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify driver',
      error: error.message
    });
  }
}));

export default router;
