import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phone: string;
    firstName: string;
    lastName?: string;
    isVerified: boolean;
    isActive: boolean;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    // Check if it's a mock token for development
    if (token.startsWith('mock-driver-token-') || token.startsWith('mock-passenger-token-')) {
      logger.info('Mock token detected - allowing for development', {
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Get a real user from database for development
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        if (token.startsWith('mock-driver-token-')) {
          // Get Priya Sharma (who has rides) for testing
          const driver = await prisma.driver.findFirst({
            where: { 
              user: { 
                firstName: 'Priya' 
              } 
            },
            include: { user: true }
          });

          if (driver) {
            req.user = {
              id: driver.user.id,
              email: driver.user.email,
              phone: driver.user.phone,
              firstName: driver.user.firstName,
              lastName: driver.user.lastName,
              isVerified: driver.user.isVerified,
              isActive: driver.user.isActive
            };
          } else {
            // Fallback to mock data if no driver found
            req.user = {
              id: 'mock-driver-id',
              email: 'driver@raahi.com',
              phone: '+91 98765 43210',
              firstName: 'John',
              lastName: 'Driver',
              isVerified: true,
              isActive: true
            };
          }
        } else if (token.startsWith('mock-passenger-token-')) {
          // Always use the same passenger ID for consistency
          // Get the first passenger user from database
          const passenger = await prisma.user.findFirst({
            where: { 
              firstName: 'John' 
            },
            orderBy: {
              id: 'asc' // Always get the same user
            }
          });

          if (passenger) {
            req.user = {
              id: passenger.id,
              email: passenger.email,
              phone: passenger.phone,
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              isVerified: passenger.isVerified,
              isActive: passenger.isActive
            };
          } else {
            // Fallback to mock data if no passenger found
            req.user = {
              id: 'mock-passenger-id',
              email: 'passenger@raahi.com',
              phone: '+91 98765 43210',
              firstName: 'John',
              lastName: 'Doe',
              isVerified: true,
              isActive: true
            };
          }
        }
      } catch (error) {
        // Fallback to mock data if database error
        req.user = {
          id: 'mock-user-id',
          email: 'user@raahi.com',
          phone: '+91 98765 43210',
          firstName: 'John',
          lastName: 'Doe',
          isVerified: true,
          isActive: true
        };
      }

      logger.info('Mock user authenticated for development', {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // For now, we'll create a mock user object
      // In a real app, you'd fetch this from the database
      req.user = {
        id: decoded.userId || 'mock-user-id',
        email: decoded.email,
        phone: decoded.phone || '+1234567890',
        firstName: decoded.firstName || 'Test',
        lastName: decoded.lastName,
        isVerified: true,
        isActive: true
      };

      logger.info('User authenticated', {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
    return;
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        id: decoded.userId || 'mock-user-id',
        email: decoded.email,
        phone: decoded.phone || '+1234567890',
        firstName: decoded.firstName || 'Test',
        lastName: decoded.lastName,
        isVerified: true,
        isActive: true
      };

      logger.info('Optional auth - user authenticated', {
        userId: req.user?.id,
        ip: req.ip
      });
    } catch (jwtError) {
      logger.info('Optional auth - invalid token, continuing without auth', {
        ip: req.ip
      });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    });
    
    // Continue without authentication for optional auth
    next();
  }
};

export const authenticateDriver = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            success: false,
            message: 'Driver access token required'
          });
          return;
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

        // Check if it's a mock token for development
        if (token.startsWith('mock-driver-token-') || token.startsWith('mock-passenger-token-')) {
          logger.info('Mock token detected - allowing for development', {
            token: token.substring(0, 20) + '...',
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          // Get a real user from database for development
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          
          try {
            if (token.startsWith('mock-driver-token-')) {
              // Always get the same driver for consistency
              const driver = await prisma.driver.findFirst({
                where: { 
                  user: { 
                    firstName: 'Priya' 
                  } 
                },
                include: { user: true },
                orderBy: {
                  id: 'asc' // Always get the same driver
                }
              });

              if (driver) {
                req.user = {
                  id: driver.user.id,
                  email: driver.user.email,
                  phone: driver.user.phone,
                  firstName: driver.user.firstName,
                  lastName: driver.user.lastName,
                  isVerified: driver.user.isVerified,
                  isActive: driver.user.isActive
                };
              } else {
                // Fallback to mock data if no driver found
                req.user = {
                  id: 'mock-driver-id',
                  email: 'driver@raahi.com',
                  phone: '+91 98765 43210',
                  firstName: 'John',
                  lastName: 'Driver',
                  isVerified: true,
                  isActive: true
                };
              }
            } else if (token.startsWith('mock-passenger-token-')) {
              // Get a passenger user for testing
              const passenger = await prisma.user.findFirst({
                where: { 
                  firstName: 'John' 
                }
              });

              if (passenger) {
                req.user = {
                  id: passenger.id,
                  email: passenger.email,
                  phone: passenger.phone,
                  firstName: passenger.firstName,
                  lastName: passenger.lastName,
                  isVerified: passenger.isVerified,
                  isActive: passenger.isActive
                };
              } else {
                // Fallback to mock data if no passenger found
                req.user = {
                  id: 'mock-passenger-id',
                  email: 'passenger@raahi.com',
                  phone: '+91 98765 43210',
                  firstName: 'John',
                  lastName: 'Doe',
                  isVerified: true,
                  isActive: true
                };
              }
            }
          } catch (error) {
            // Fallback to mock data if database error
            req.user = {
              id: 'mock-user-id',
              email: 'user@raahi.com',
              phone: '+91 98765 43210',
              firstName: 'John',
              lastName: 'Doe',
              isVerified: true,
              isActive: true
            };
          }

          logger.info('Mock user authenticated for development', {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          next();
          return;
        }

        try {
          const decoded = jwt.verify(token, jwtSecret) as any;

          // For real driver authentication, we'll create a driver user object
          req.user = {
            id: decoded.driverId || decoded.userId || 'real-driver-id',
            email: decoded.email,
            phone: decoded.phone || '+1234567890',
            firstName: decoded.firstName || 'Driver',
            lastName: decoded.lastName || 'Test',
            isVerified: true,
            isActive: true
          };

          logger.info('Real driver authenticated', {
            driverId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          next();
        } catch (jwtError) {
          logger.warn('Invalid driver JWT token', {
            error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          res.status(401).json({
            success: false,
            message: 'Invalid or expired driver token'
          });
          return;
        }
      } catch (error) {
        logger.error('Driver authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(500).json({
          success: false,
          message: 'Driver authentication failed'
        });
        return;
      }
    };
