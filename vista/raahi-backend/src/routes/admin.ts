import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { OnboardingStatus, DocumentType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

/**
 * @route   GET /api/admin/drivers
 * @desc    Get all drivers (with optional filters)
 * @access  Private (Admin only)
 */
router.get('/drivers', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] GET ALL DRIVERS`, { adminId: req.user?.id });

  try {
    const { status, search, limit = '100', offset = '0', filter = 'all' } = req.query;

    logger.info(`[${requestId}] Filter params:`, { filter, search, status, limit, offset });

    // Build where clause based on filter
    const whereClause: any = {};

    // Apply filter
    if (filter === 'pending') {
      // Drivers with unverified documents
      whereClause.AND = [
        {
          isVerified: false
        },
        {
          OR: [
            {
              documents: {
                some: {
                  isVerified: false
                }
              }
            },
            {
              documents: {
                none: {}
              }
            }
          ]
        }
      ];
    } else if (filter === 'verified') {
      // Fully verified drivers
      whereClause.isVerified = true;
    } else if (filter === 'rejected') {
      // Rejected drivers
      whereClause.onboardingStatus = OnboardingStatus.REJECTED;
    }
    // 'all' filter shows everyone (no additional where clause)

    // Add search filter
    if (search && typeof search === 'string') {
      const searchConditions = {
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search, mode: 'insensitive' } } }
        ]
      };

      if (whereClause.AND) {
        // If AND already exists, add search to it
        whereClause.AND.push(searchConditions);
      } else if (Object.keys(whereClause).length > 0) {
        // If other conditions exist, combine with AND
        whereClause.AND = [
          { ...whereClause },
          searchConditions
        ];
        // Remove the original conditions
        Object.keys(whereClause).forEach(key => {
          if (key !== 'AND') delete whereClause[key];
        });
      } else {
        // No other conditions, just add search
        whereClause.OR = searchConditions.OR;
      }
    }

    // Add status filter (optional - only if not already filtering by status)
    if (status && typeof status === 'string' && filter !== 'rejected') {
      if (whereClause.AND) {
        whereClause.AND.push({ onboardingStatus: status });
      } else {
        whereClause.onboardingStatus = status;
      }
    }

    logger.info(`[${requestId}] Where clause:`, JSON.stringify(whereClause, null, 2));

    // Build query - use empty where clause for 'all' filter
    const queryWhere = Object.keys(whereClause).length > 0 ? whereClause : undefined;

    logger.info(`[${requestId}] Query where clause:`, queryWhere ? JSON.stringify(queryWhere, null, 2) : 'EMPTY (all drivers)');

    const drivers = await prisma.driver.findMany({
      where: queryWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    logger.info(`[${requestId}] Found ${drivers.length} drivers`);

    // Get total count
    const totalCount = await prisma.driver.count({ where: queryWhere });
    
    logger.info(`[${requestId}] Total count: ${totalCount}`);

    // Format response
    const formattedDrivers = drivers.map(driver => {
      const allDocsVerified = driver.documents.length > 0 && 
                             driver.documents.every(doc => doc.isVerified);
      const pendingDocs = driver.documents.filter(doc => !doc.isVerified);
      const rejectedDocs = driver.documents.filter(doc => doc.rejectionReason);

      return {
        driver_id: driver.id,
        user: {
          id: driver.user.id,
          name: `${driver.user.firstName} ${driver.user.lastName}`,
          email: driver.user.email,
          phone: driver.user.phone,
          created_at: driver.user.createdAt
        },
        onboarding_status: driver.onboardingStatus,
        vehicle_info: {
          type: driver.vehicleType,
          model: driver.vehicleModel,
          number: driver.vehicleNumber,
          color: driver.vehicleColor,
          year: driver.vehicleYear
        },
        documents: driver.documents.map(doc => ({
          id: doc.id,
          type: doc.documentType,
          url: doc.documentUrl,
          name: doc.documentName,
          size: doc.documentSize,
          is_verified: doc.isVerified,
          verified_at: doc.verifiedAt,
          verified_by: doc.verifiedBy,
          rejection_reason: doc.rejectionReason,
          uploaded_at: doc.uploadedAt
        })),
        documents_summary: {
          total: driver.documents.length,
          verified: driver.documents.filter(d => d.isVerified).length,
          pending: pendingDocs.length,
          rejected: rejectedDocs.length,
          all_verified: allDocsVerified
        },
        submitted_at: driver.documentsSubmittedAt,
        verified_at: driver.documentsVerifiedAt,
        preferred_language: driver.preferredLanguage,
        service_types: driver.serviceTypes,
        verification_notes: driver.verificationNotes,
        is_verified: driver.isVerified,
        is_online: driver.isOnline,
        rating: driver.rating,
        total_trips: driver.totalRides
      };
    });

    res.json({
      success: true,
      data: {
        drivers: formattedDrivers,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more: parseInt(offset as string) + parseInt(limit as string) < totalCount
        }
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching all drivers`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/admin/drivers/pending
 * @desc    Get all drivers pending document verification
 * @access  Private (Admin only - for now using authenticate, in production use authenticateAdmin)
 */
router.get('/drivers/pending', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] GET PENDING DRIVERS`, { adminId: req.user?.id });

  try {
    const { status, search, limit = '50', offset = '0' } = req.query;

    // Build where clause - Show drivers with unverified documents (regardless of onboarding status)
    // This ensures we catch all drivers who need verification, even if status wasn't updated properly
    const whereClause: any = {
      // Driver must have at least one unverified document
      documents: {
        some: {
          isVerified: false
        }
      },
      // Driver is not yet fully verified
      isVerified: false
    };

    // Add search filter
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Add status filter (optional - if provided, also filter by onboarding status)
    if (status && typeof status === 'string') {
      whereClause.onboardingStatus = status;
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      },
      orderBy: { documentsSubmittedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count
    const totalCount = await prisma.driver.count({ where: whereClause });

    // Format response
    const formattedDrivers = drivers.map(driver => {
      const allDocsVerified = driver.documents.length > 0 && 
                             driver.documents.every(doc => doc.isVerified);
      const pendingDocs = driver.documents.filter(doc => !doc.isVerified);
      const rejectedDocs = driver.documents.filter(doc => doc.rejectionReason);

      return {
        driver_id: driver.id,
        user: {
          id: driver.user.id,
          name: `${driver.user.firstName} ${driver.user.lastName}`,
          email: driver.user.email,
          phone: driver.user.phone,
          created_at: driver.user.createdAt
        },
        onboarding_status: driver.onboardingStatus,
        vehicle_info: {
          type: driver.vehicleType,
          model: driver.vehicleModel,
          number: driver.vehicleNumber,
          color: driver.vehicleColor,
          year: driver.vehicleYear
        },
        documents: driver.documents.map(doc => ({
          id: doc.id,
          type: doc.documentType,
          url: doc.documentUrl,
          name: doc.documentName,
          size: doc.documentSize,
          is_verified: doc.isVerified,
          verified_at: doc.verifiedAt,
          verified_by: doc.verifiedBy,
          rejection_reason: doc.rejectionReason,
          uploaded_at: doc.uploadedAt
        })),
        documents_summary: {
          total: driver.documents.length,
          verified: driver.documents.filter(d => d.isVerified).length,
          pending: pendingDocs.length,
          rejected: rejectedDocs.length,
          all_verified: allDocsVerified
        },
        submitted_at: driver.documentsSubmittedAt,
        verified_at: driver.documentsVerifiedAt,
        preferred_language: driver.preferredLanguage,
        service_types: driver.serviceTypes,
        verification_notes: driver.verificationNotes,
        is_verified: driver.isVerified
      };
    });

    res.json({
      success: true,
      data: {
        drivers: formattedDrivers,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more: parseInt(offset as string) + parseInt(limit as string) < totalCount
        }
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching pending drivers`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending drivers',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/admin/drivers/:driverId
 * @desc    Get detailed driver information with documents
 * @access  Private (Admin only)
 */
router.get('/drivers/:driverId', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  const { driverId } = req.params;
  
  logger.info(`[${requestId}] GET DRIVER DETAILS`, { adminId: req.user?.id, driverId });

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
      return;
    }

    const allDocsVerified = driver.documents.length > 0 && 
                           driver.documents.every(doc => doc.isVerified);

    res.json({
      success: true,
      data: {
        driver_id: driver.id,
        user: {
          id: driver.user.id,
          name: `${driver.user.firstName} ${driver.user.lastName}`,
          email: driver.user.email,
          phone: driver.user.phone,
          created_at: driver.user.createdAt
        },
        onboarding_status: driver.onboardingStatus,
        vehicle_info: {
          type: driver.vehicleType,
          model: driver.vehicleModel,
          number: driver.vehicleNumber,
          color: driver.vehicleColor,
          year: driver.vehicleYear,
          license_number: driver.licenseNumber,
          license_expiry: driver.licenseExpiry
        },
        documents: driver.documents.map(doc => ({
          id: doc.id,
          type: doc.documentType,
          url: doc.documentUrl,
          name: doc.documentName,
          size: doc.documentSize,
          is_verified: doc.isVerified,
          verified_at: doc.verifiedAt,
          verified_by: doc.verifiedBy,
          rejection_reason: doc.rejectionReason,
          uploaded_at: doc.uploadedAt
        })),
        documents_verified: allDocsVerified,
        submitted_at: driver.documentsSubmittedAt,
        verified_at: driver.documentsVerifiedAt,
        preferred_language: driver.preferredLanguage,
        service_types: driver.serviceTypes,
        verification_notes: driver.verificationNotes,
        is_verified: driver.isVerified,
        rating: driver.rating,
        total_trips: driver.totalRides,
        current_latitude: driver.currentLatitude,
        current_longitude: driver.currentLongitude
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching driver details`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver details',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/admin/documents/:documentId/verify
 * @desc    Verify or reject a specific document
 * @access  Private (Admin only)
 */
router.post('/documents/:documentId/verify', authenticate, [
  body('approved').isBoolean().withMessage('Approved status must be boolean'),
  body('rejection_reason').optional().isString().withMessage('Rejection reason must be a string')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const requestId = Math.random().toString(36).substring(7);
  const { documentId } = req.params;
  const { approved, rejection_reason } = req.body;
  const adminId = req.user!.id;

  logger.info(`[${requestId}] VERIFY DOCUMENT`, { adminId, documentId, approved });

  try {
    // Find the document
    const document = await prisma.driverDocument.findUnique({
      where: { id: documentId },
      include: { driver: true }
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    // Update document verification status
    const updatedDocument = await prisma.driverDocument.update({
      where: { id: documentId },
      data: {
        isVerified: approved,
        verifiedAt: approved ? new Date() : null,
        verifiedBy: adminId,
        rejectionReason: approved ? null : rejection_reason
      }
    });

    // Get all documents for this driver
    const allDriverDocuments = await prisma.driverDocument.findMany({
      where: { driverId: document.driverId }
    });

    // Check if all documents are verified
    const allDocsVerified = allDriverDocuments.length > 0 && 
                           allDriverDocuments.every(doc => doc.isVerified);

    // Check if any document is rejected
    const hasRejectedDocs = allDriverDocuments.some(doc => doc.rejectionReason);

    // Update driver status based on document verification
    let newOnboardingStatus = document.driver.onboardingStatus;
    let isVerified = document.driver.isVerified;
    let verificationNotes = document.driver.verificationNotes;

    if (allDocsVerified) {
      newOnboardingStatus = OnboardingStatus.COMPLETED;
      isVerified = true;
      verificationNotes = 'All documents verified. You can now start accepting rides!';
    } else if (hasRejectedDocs) {
      newOnboardingStatus = OnboardingStatus.REJECTED;
      isVerified = false;
      verificationNotes = 'Some documents were rejected. Please re-upload the rejected documents.';
    }

    await prisma.driver.update({
      where: { id: document.driverId },
      data: {
        onboardingStatus: newOnboardingStatus,
        isVerified,
        documentsVerifiedAt: allDocsVerified ? new Date() : null,
        verificationNotes
      }
    });

    logger.info(`[${requestId}] Document verification completed`, {
      documentId,
      approved,
      driverId: document.driverId,
      allDocsVerified,
      newStatus: newOnboardingStatus
    });

    res.json({
      success: true,
      message: approved ? 'Document approved successfully' : 'Document rejected',
      data: {
        document_id: updatedDocument.id,
        document_type: updatedDocument.documentType,
        is_verified: updatedDocument.isVerified,
        verified_at: updatedDocument.verifiedAt,
        rejection_reason: updatedDocument.rejectionReason,
        driver_status: {
          all_documents_verified: allDocsVerified,
          onboarding_status: newOnboardingStatus,
          is_verified: isVerified,
          can_start_rides: isVerified && allDocsVerified
        }
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error verifying document`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/admin/drivers/:driverId/verify-all
 * @desc    Approve or reject all documents for a driver at once
 * @access  Private (Admin only)
 */
router.post('/drivers/:driverId/verify-all', authenticate, [
  body('approved').isBoolean().withMessage('Approved status must be boolean'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const requestId = Math.random().toString(36).substring(7);
  const { driverId } = req.params;
  const { approved, notes } = req.body;
  const adminId = req.user!.id;

  logger.info(`[${requestId}] VERIFY ALL DOCUMENTS`, { adminId, driverId, approved });

  try {
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

    // Update all documents
    await prisma.driverDocument.updateMany({
      where: { driverId },
      data: {
        isVerified: approved,
        verifiedAt: approved ? new Date() : null,
        verifiedBy: adminId,
        rejectionReason: approved ? null : 'Rejected by admin'
      }
    });

    // Update driver status
    const newStatus = approved ? OnboardingStatus.COMPLETED : OnboardingStatus.REJECTED;
    const verificationNotes = notes || (approved 
      ? 'All documents verified. You can now start accepting rides!' 
      : 'Documents verification failed. Please re-upload valid documents.');

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        onboardingStatus: newStatus,
        isVerified: approved,
        documentsVerifiedAt: approved ? new Date() : null,
        verificationNotes
      }
    });

    logger.info(`[${requestId}] All documents verified`, {
      driverId,
      approved,
      totalDocuments: driver.documents.length
    });

    res.json({
      success: true,
      message: approved ? 'All documents approved successfully' : 'All documents rejected',
      data: {
        driver_id: driverId,
        documents_updated: driver.documents.length,
        onboarding_status: newStatus,
        is_verified: approved,
        can_start_rides: approved,
        verification_notes: verificationNotes
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error verifying all documents`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify documents',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/admin/statistics
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', authenticate, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[${requestId}] GET ADMIN STATISTICS`, { adminId: req.user?.id });

  try {
    const [
      totalDrivers,
      verifiedDrivers,
      pendingVerification,
      rejectedDrivers,
      totalDocuments,
      pendingDocuments,
      verifiedDocuments
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { isVerified: true } }),
      // Count drivers with unverified documents OR not verified yet (includes early onboarding)
      prisma.driver.count({ 
        where: { 
          AND: [
            {
              isVerified: false
            },
            {
              OR: [
                {
                  documents: {
                    some: {
                      isVerified: false
                    }
                  }
                },
                {
                  documents: {
                    none: {}
                  }
                }
              ]
            }
          ]
        }
      }),
      prisma.driver.count({ where: { onboardingStatus: OnboardingStatus.REJECTED } }),
      prisma.driverDocument.count(),
      prisma.driverDocument.count({ where: { isVerified: false, rejectionReason: null } }),
      prisma.driverDocument.count({ where: { isVerified: true } })
    ]);

    res.json({
      success: true,
      data: {
        drivers: {
          total: totalDrivers,
          verified: verifiedDrivers,
          pending_verification: pendingVerification,
          rejected: rejectedDrivers
        },
        documents: {
          total: totalDocuments,
          verified: verifiedDocuments,
          pending: pendingDocuments
        }
      }
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching statistics`, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
}));

export default router;

