import twilio from 'twilio';
import { logger } from '../utils/logger';

// Initialize Twilio client only if VALID credentials are provided
// Check if credentials are real (not placeholders)
const isValidTwilioConfig = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_PHONE_NUMBER;
  
  return sid && 
         token && 
         phone &&
         sid.startsWith('AC') && 
         !sid.includes('your-') && 
         !token.includes('your-') &&
         phone.startsWith('+');
};

const client = isValidTwilioConfig()
  ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  : null;

// Log Twilio status on startup
if (client) {
  logger.info('✅ Twilio SMS service initialized');
} else {
  logger.warn('⚠️  Twilio not configured - using development mode (OTPs will be logged to console)');
}

export interface OTPResult {
  success: boolean;
  otp?: string;
  message?: string;
}

export class SMSService {
  /**
   * Send OTP via SMS
   */
  static async sendOTP(phoneNumber: string): Promise<OTPResult> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In development or if Twilio not configured, just log the OTP
      if (process.env.NODE_ENV === 'development' || !client) {
        logger.info(`OTP for ${phoneNumber}: ${otp}`);
        return {
          success: true,
          otp,
          message: client ? 'OTP sent successfully (development mode)' : 'OTP sent successfully (Twilio not configured)'
        };
      }

      // Send SMS via Twilio (client is guaranteed to be non-null here)
      if (!client) {
        throw new Error('Twilio client not initialized');
      }
      
      const message = await client.messages.create({
        body: `Your Raahi verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      logger.info(`SMS sent to ${phoneNumber}, SID: ${message.sid}`);
      
      return {
        success: true,
        otp,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  /**
   * Send ride confirmation SMS
   */
  static async sendRideConfirmation(
    phoneNumber: string,
    driverName: string,
    driverPhone: string,
    vehicleNumber: string,
    estimatedArrival: string
  ): Promise<OTPResult> {
    try {
      const message = `Your Raahi ride is confirmed! Driver: ${driverName} (${driverPhone}), Vehicle: ${vehicleNumber}. ETA: ${estimatedArrival}`;
      
      if (process.env.NODE_ENV === 'development' || !client) {
        logger.info(`Ride confirmation SMS for ${phoneNumber}: ${message}`);
        return {
          success: true,
          message: client ? 'Ride confirmation sent (development mode)' : 'Ride confirmation sent (Twilio not configured)'
        };
      }

      if (!client) {
        throw new Error('Twilio client not initialized');
      }

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      logger.info(`Ride confirmation SMS sent to ${phoneNumber}`);
      
      return {
        success: true,
        message: 'Ride confirmation sent'
      };
    } catch (error) {
      logger.error('Error sending ride confirmation SMS:', error);
      return {
        success: false,
        message: 'Failed to send ride confirmation'
      };
    }
  }

  /**
   * Send ride update SMS
   */
  static async sendRideUpdate(
    phoneNumber: string,
    message: string
  ): Promise<OTPResult> {
    try {
      if (process.env.NODE_ENV === 'development' || !client) {
        logger.info(`Ride update SMS for ${phoneNumber}: ${message}`);
        return {
          success: true,
          message: client ? 'Ride update sent (development mode)' : 'Ride update sent (Twilio not configured)'
        };
      }

      if (!client) {
        throw new Error('Twilio client not initialized');
      }

      await client.messages.create({
        body: `Raahi Update: ${message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      logger.info(`Ride update SMS sent to ${phoneNumber}`);
      
      return {
        success: true,
        message: 'Ride update sent'
      };
    } catch (error) {
      logger.error('Error sending ride update SMS:', error);
      return {
        success: false,
        message: 'Failed to send ride update'
      };
    }
  }

  /**
   * Verify OTP (placeholder - in production, use Redis or database)
   */
  static async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    // In production, verify against stored OTP in Redis/database
    // For now, accept any 6-digit OTP
    return /^\d{6}$/.test(otp);
  }
}

// Export convenience functions
export const sendOTP = (phoneNumber: string) => SMSService.sendOTP(phoneNumber);
export const verifyOTP = (phoneNumber: string, otp: string) => SMSService.verifyOTP(phoneNumber, otp);
export const sendRideConfirmation = (phoneNumber: string, driverName: string, driverPhone: string, vehicleNumber: string, estimatedArrival: string) => 
  SMSService.sendRideConfirmation(phoneNumber, driverName, driverPhone, vehicleNumber, estimatedArrival);
export const sendRideUpdate = (phoneNumber: string, message: string) => 
  SMSService.sendRideUpdate(phoneNumber, message);
