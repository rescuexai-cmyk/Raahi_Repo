import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../database/connection';
import { logger } from '../utils/logger';
import { sendOTP, verifyOTP } from './smsService';
import { sendEmail } from './emailService';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone: string;
  firstName: string;
  lastName?: string;
  profileImage?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export class AuthService {
  /**
   * Generate JWT tokens
   */
  private static generateTokens(userId: string): AuthTokens {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    
    if (!jwtSecret || !refreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    // Use any to bypass TypeScript JWT issues
    const jwtAny = jwt as any;
    const accessToken = jwtAny.sign(
      { userId, type: 'access' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const refreshToken = jwtAny.sign(
      { userId, type: 'refresh' },
      refreshSecret,
      { expiresIn: '30d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  /**
   * Save refresh token to database
   */
  private static async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  }

  /**
   * Mobile OTP Authentication
   */
  static async sendMobileOTP(phone: string, countryCode: string = '+91'): Promise<{ success: boolean; message: string }> {
    try {
      const fullPhone = `${countryCode}${phone}`;
      
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { phone: fullPhone }
      });

      // Create user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: fullPhone,
            firstName: 'User', // Will be updated after verification
            isVerified: false
          }
        });
      }

      // Send OTP
      const otpResult = await sendOTP(fullPhone);
      
      if (otpResult.success) {
        // Store OTP in cache for verification
        const { setCache } = await import('@/utils/redis');
        await setCache(`otp:${fullPhone}`, otpResult.otp, 300); // 5 minutes expiry
        
        logger.info(`OTP sent to ${fullPhone}`);
        return {
          success: true,
          message: 'OTP sent successfully'
        };
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error) {
      logger.error('Error sending mobile OTP:', error);
      throw new Error('Failed to send OTP');
    }
  }

  /**
   * Verify Mobile OTP
   */
  static async verifyMobileOTP(phone: string, otp: string, countryCode: string = '+91'): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    try {
      const fullPhone = `${countryCode}${phone}`;
      
      // Verify OTP (in development, accept any 6-digit OTP)
      if (process.env.NODE_ENV === 'development') {
        if (!/^\d{6}$/.test(otp)) {
          throw new Error('Invalid OTP format');
        }
        logger.info(`Development mode: Accepting OTP ${otp} for ${fullPhone}`);
      } else {
        // Get OTP from cache
        const { getCache, deleteCache } = await import('@/utils/redis');
        const storedOTP = await getCache(`otp:${fullPhone}`);
        
        if (!storedOTP || storedOTP !== otp) {
          throw new Error('Invalid OTP');
        }
        
        // Clear OTP from cache after successful verification
        await deleteCache(`otp:${fullPhone}`);
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { phone: fullPhone }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: fullPhone,
            firstName: 'User',
            isVerified: true
          }
        });
      } else {
        // Update user as verified
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            lastLoginAt: new Date()
          }
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user.id);
      
      // Save refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      logger.info(`User ${user.id} verified with mobile OTP`);
      
      return {
        user: {
          id: user.id,
          email: user.email || undefined,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName || undefined,
          profileImage: user.profileImage || undefined,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || undefined
        },
        tokens
      };
    } catch (error) {
      logger.error('Error verifying mobile OTP:', error);
      throw new Error('Invalid OTP or verification failed');
    }
  }

  /**
   * Google OAuth Authentication
   */
  static async authenticateWithGoogle(idToken: string): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    try {
      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token');
      }

      const { email, given_name, family_name, picture } = payload;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            phone: '', // Will be updated later
            firstName: given_name || 'User',
            lastName: family_name,
            profileImage: picture,
            isVerified: true
          }
        });
      } else {
        // Update last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            profileImage: picture || user.profileImage
          }
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user.id);
      
      // Save refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      logger.info(`User ${user.id} authenticated with Google`);
      
      return {
        user: {
          id: user.id,
          email: user.email || undefined,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName || undefined,
          profileImage: user.profileImage || undefined,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || undefined
        },
        tokens
      };
    } catch (error) {
      logger.error('Error authenticating with Google:', error);
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Truecaller Authentication
   */
  static async authenticateWithTruecaller(phone: string, truecallerToken: string): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    try {
      // In a real implementation, you would verify the Truecaller token
      // For now, we'll just validate the phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        throw new Error('Invalid phone number format');
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { phone }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            firstName: 'User',
            isVerified: true
          }
        });
      } else {
        // Update last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date()
          }
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user.id);
      
      // Save refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      logger.info(`User ${user.id} authenticated with Truecaller`);
      
      return {
        user: {
          id: user.id,
          email: user.email || undefined,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName || undefined,
          profileImage: user.profileImage || undefined,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || undefined
        },
        tokens
      };
    } catch (error) {
      logger.error('Error authenticating with Truecaller:', error);
      throw new Error('Truecaller authentication failed');
    }
  }

  /**
   * Refresh Access Token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new access token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT secret not configured');
      }
      
      const jwtAny = jwt as any;
      const accessToken = jwtAny.sign(
        { userId: decoded.userId, type: 'access' },
        jwtSecret,
        { expiresIn: '7d' }
      );

      logger.info(`Access token refreshed for user ${decoded.userId}`);

      return {
        accessToken,
        expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  static async logout(refreshToken: string): Promise<void> {
    try {
      // Remove refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Error during logout:', error);
      throw new Error('Logout failed');
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
        profileImage: user.profileImage || undefined,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || undefined
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      profileImage?: string;
    }
  ): Promise<UserProfile> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      logger.info(`User profile updated for ${userId}`);

      return {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
        profileImage: user.profileImage || undefined,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || undefined
      };
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }
}
