import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export interface EmailResult {
  success: boolean;
  message?: string;
}

export class EmailService {
  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Welcome to Raahi!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #cf923d;">Welcome to Raahi, ${firstName}!</h2>
            <p>Thank you for joining Raahi - your trusted ride companion.</p>
            <p>We're excited to make your journeys smooth as butter! 🧈</p>
            <div style="background-color: #f6efd8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What's next?</h3>
              <ul>
                <li>Complete your profile</li>
                <li>Book your first ride</li>
                <li>Enjoy seamless transportation</li>
              </ul>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Raahi Team</p>
          </div>
        `
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info(`Welcome email for ${email}: ${JSON.stringify(mailOptions)}`);
        return {
          success: true,
          message: 'Welcome email sent (development mode)'
        };
      }

      await transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
      
      return {
        success: true,
        message: 'Welcome email sent'
      };
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email'
      };
    }
  }

  /**
   * Send ride receipt email
   */
  static async sendRideReceipt(
    email: string,
    rideDetails: {
      rideId: string;
      pickupAddress: string;
      dropAddress: string;
      distance: number;
      duration: number;
      totalFare: number;
      paymentMethod: string;
      driverName: string;
      vehicleNumber: string;
      completedAt: Date;
    }
  ): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: `Your Raahi ride receipt - ${rideDetails.rideId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #cf923d;">Ride Receipt</h2>
            <div style="background-color: #f6efd8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Ride Details</h3>
              <p><strong>Ride ID:</strong> ${rideDetails.rideId}</p>
              <p><strong>From:</strong> ${rideDetails.pickupAddress}</p>
              <p><strong>To:</strong> ${rideDetails.dropAddress}</p>
              <p><strong>Distance:</strong> ${rideDetails.distance} km</p>
              <p><strong>Duration:</strong> ${rideDetails.duration} minutes</p>
              <p><strong>Driver:</strong> ${rideDetails.driverName}</p>
              <p><strong>Vehicle:</strong> ${rideDetails.vehicleNumber}</p>
              <p><strong>Completed:</strong> ${rideDetails.completedAt.toLocaleString()}</p>
            </div>
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Payment Details</h3>
              <p><strong>Total Fare:</strong> ₹${rideDetails.totalFare}</p>
              <p><strong>Payment Method:</strong> ${rideDetails.paymentMethod}</p>
            </div>
            <p>Thank you for choosing Raahi!</p>
            <p>Best regards,<br>The Raahi Team</p>
          </div>
        `
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info(`Ride receipt email for ${email}: ${JSON.stringify(mailOptions)}`);
        return {
          success: true,
          message: 'Ride receipt sent (development mode)'
        };
      }

      await transporter.sendMail(mailOptions);
      logger.info(`Ride receipt email sent to ${email}`);
      
      return {
        success: true,
        message: 'Ride receipt sent'
      };
    } catch (error) {
      logger.error('Error sending ride receipt email:', error);
      return {
        success: false,
        message: 'Failed to send ride receipt'
      };
    }
  }

  /**
   * Send driver verification email
   */
  static async sendDriverVerificationEmail(
    email: string,
    driverName: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<EmailResult> {
    try {
      const isApproved = status === 'approved';
      const subject = isApproved 
        ? 'Congratulations! Your driver application has been approved'
        : 'Driver application update';
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${isApproved ? '#28a745' : '#dc3545'};">
              ${isApproved ? '🎉 Congratulations!' : 'Driver Application Update'}
            </h2>
            <p>Dear ${driverName},</p>
            ${isApproved 
              ? `
                <p>Great news! Your driver application has been approved. You can now start accepting rides on Raahi.</p>
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Next Steps:</h3>
                  <ul>
                    <li>Download the Raahi Driver app</li>
                    <li>Complete your profile setup</li>
                    <li>Start accepting rides and earning money!</li>
                  </ul>
                </div>
              `
              : `
                <p>We regret to inform you that your driver application has been rejected.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>What's next?</h3>
                  <p>You can reapply after addressing the issues mentioned above. We're here to help you succeed!</p>
                </div>
              `
            }
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The Raahi Team</p>
          </div>
        `
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info(`Driver verification email for ${email}: ${JSON.stringify(mailOptions)}`);
        return {
          success: true,
          message: 'Driver verification email sent (development mode)'
        };
      }

      await transporter.sendMail(mailOptions);
      logger.info(`Driver verification email sent to ${email}`);
      
      return {
        success: true,
        message: 'Driver verification email sent'
      };
    } catch (error) {
      logger.error('Error sending driver verification email:', error);
      return {
        success: false,
        message: 'Failed to send driver verification email'
      };
    }
  }
}

// Export convenience functions
export const sendEmail = (email: string, subject: string, html: string) => 
  EmailService.sendWelcomeEmail(email, 'User'); // Simplified for now
export const sendWelcomeEmail = (email: string, firstName: string) => 
  EmailService.sendWelcomeEmail(email, firstName);
export const sendRideReceipt = (email: string, rideDetails: any) => 
  EmailService.sendRideReceipt(email, rideDetails);
export const sendDriverVerificationEmail = (email: string, driverName: string, status: 'approved' | 'rejected', reason?: string) => 
  EmailService.sendDriverVerificationEmail(email, driverName, status, reason);
