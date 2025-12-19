import RazorpayCheckout from 'react-native-razorpay';
import { query } from './database';
import { notificationService } from './notificationService';

interface PaymentOptions {
  amount: number; // Amount in rupees (will be converted to paise)
  currency?: string;
  orderId?: string;
  name?: string;
  description?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  notes?: any;
  theme?: {
    color?: string;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

interface PaymentRecord {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

class PaymentService {
  private razorpayKeyId: string;
  private razorpayKeySecret: string;

  constructor() {
    this.razorpayKeyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'your_razorpay_key_id';
    this.razorpayKeySecret = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret';
  }

  // Initialize payment tables in database
  async initializePaymentTables(): Promise<void> {
    const createTablesSQL = `
      -- Payment records table
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rides(id),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL,
        razorpay_payment_id VARCHAR(255),
        razorpay_order_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        status VARCHAR(20) CHECK (status IN ('pending', 'success', 'failed', 'refunded')) DEFAULT 'pending',
        failure_reason TEXT,
        refund_id VARCHAR(255),
        refund_amount DECIMAL(10,2),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- User payment methods table
      CREATE TABLE IF NOT EXISTS user_payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method_type VARCHAR(50) NOT NULL, -- 'card', 'upi', 'netbanking', 'wallet'
        provider VARCHAR(50), -- 'razorpay', 'paytm', 'googlepay', etc.
        token VARCHAR(255), -- Tokenized payment method
        last_four VARCHAR(4), -- Last 4 digits for cards
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Razorpay orders table for tracking
      CREATE TABLE IF NOT EXISTS razorpay_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
        ride_id UUID NOT NULL REFERENCES rides(id),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        receipt VARCHAR(255),
        status VARCHAR(50) DEFAULT 'created',
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
      CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id ON user_payment_methods(user_id);
      CREATE INDEX IF NOT EXISTS idx_razorpay_orders_ride_id ON razorpay_orders(ride_id);

      -- Update triggers
      DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
      CREATE TRIGGER update_payments_updated_at 
        BEFORE UPDATE ON payments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_user_payment_methods_updated_at ON user_payment_methods;
      CREATE TRIGGER update_user_payment_methods_updated_at 
        BEFORE UPDATE ON user_payment_methods 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_razorpay_orders_updated_at ON razorpay_orders;
      CREATE TRIGGER update_razorpay_orders_updated_at 
        BEFORE UPDATE ON razorpay_orders 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await query(createTablesSQL);
  }

  // Create Razorpay order
  async createOrder(amount: number, currency: string = 'INR', receipt?: string): Promise<RazorpayOrder | null> {
    try {
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      };

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const order = await response.json();
      console.log('Razorpay order created:', order);
      
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return null;
    }
  }

  // Save order to database
  async saveOrderToDatabase(order: RazorpayOrder, rideId: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `INSERT INTO razorpay_orders (razorpay_order_id, ride_id, user_id, amount, currency, receipt, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, rideId, userId, order.amount / 100, order.currency, order.receipt || '', order.status]
      );

      return !result.error;
    } catch (error) {
      console.error('Error saving order to database:', error);
      return false;
    }
  }

  // Process payment using Razorpay
  async processPayment(
    rideId: string,
    userId: string,
    amount: number,
    userDetails: { name: string; email: string; phone: string }
  ): Promise<PaymentResult> {
    try {
      // Create Razorpay order first
      const order = await this.createOrder(amount, 'INR', `ride_${rideId}`);
      
      if (!order) {
        return {
          success: false,
          error: 'Failed to create payment order',
        };
      }

      // Save order to database
      await this.saveOrderToDatabase(order, rideId, userId);

      // Create payment record
      const paymentResult = await query(
        `INSERT INTO payments (ride_id, user_id, amount, currency, payment_method, razorpay_order_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [rideId, userId, amount, 'INR', 'razorpay', order.id, 'pending']
      );

      if (paymentResult.error) {
        throw new Error('Failed to create payment record');
      }

      // Prepare Razorpay checkout options
      const options: PaymentOptions = {
        amount: amount,
        currency: 'INR',
        orderId: order.id,
        name: 'RideApp',
        description: `Payment for ride #${rideId.slice(-8)}`,
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone,
        },
        theme: {
          color: '#3399cc',
        },
        notes: {
          ride_id: rideId,
          user_id: userId,
        },
      };

      // Open Razorpay checkout
      const razorpayResult = await this.openRazorpayCheckout(options);

      if (razorpayResult.success && razorpayResult.paymentId) {
        // Verify payment signature
        const isValidSignature = await this.verifyPaymentSignature(
          order.id,
          razorpayResult.paymentId,
          razorpayResult.signature || ''
        );

        if (isValidSignature) {
          // Update payment record
          await this.updatePaymentRecord(
            paymentResult.data[0].id,
            razorpayResult.paymentId,
            razorpayResult.signature || '',
            'success'
          );

          // Update ride payment status
          await query(
            'UPDATE rides SET payment_status = $1 WHERE id = $2',
            ['paid', rideId]
          );

          // Send success notification
          await notificationService.notifyPaymentSuccess(userId, amount);

          return {
            success: true,
            paymentId: razorpayResult.paymentId,
            orderId: order.id,
            signature: razorpayResult.signature,
          };
        } else {
          // Update payment record as failed
          await this.updatePaymentRecord(
            paymentResult.data[0].id,
            razorpayResult.paymentId,
            razorpayResult.signature || '',
            'failed',
            'Signature verification failed'
          );

          await notificationService.notifyPaymentFailed(userId, 'Signature verification failed');

          return {
            success: false,
            error: 'Payment signature verification failed',
          };
        }
      } else {
        // Update payment record as failed
        await this.updatePaymentRecord(
          paymentResult.data[0].id,
          '',
          '',
          'failed',
          razorpayResult.error || 'Payment cancelled by user'
        );

        await notificationService.notifyPaymentFailed(userId, razorpayResult.error || 'Payment cancelled');

        return {
          success: false,
          error: razorpayResult.error || 'Payment failed',
        };
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      await notificationService.notifyPaymentFailed(userId, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Open Razorpay checkout
  private async openRazorpayCheckout(options: PaymentOptions): Promise<PaymentResult> {
    return new Promise((resolve) => {
      const razorpayOptions = {
        description: options.description || 'Payment for ride',
        image: 'https://i.imgur.com/3g7nmJC.png', // Your app logo
        currency: options.currency || 'INR',
        key: this.razorpayKeyId,
        amount: Math.round(options.amount * 100), // Convert to paise
        name: options.name || 'RideApp',
        order_id: options.orderId,
        prefill: {
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
          name: options.prefill?.name || '',
        },
        theme: {
          color: options.theme?.color || '#3399cc',
        },
      };

      RazorpayCheckout.open(razorpayOptions)
        .then((data: any) => {
          console.log('Razorpay success:', data);
          resolve({
            success: true,
            paymentId: data.razorpay_payment_id,
            orderId: data.razorpay_order_id,
            signature: data.razorpay_signature,
          });
        })
        .catch((error: any) => {
          console.log('Razorpay error:', error);
          resolve({
            success: false,
            error: error.description || error.error?.description || 'Payment failed',
          });
        });
    });
  }

  // Verify payment signature
  private async verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    try {
      // This should ideally be done on your backend server for security
      // For demo purposes, we're doing basic verification here
      
      const crypto = require('crypto');
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  // Update payment record
  private async updatePaymentRecord(
    paymentId: string,
    razorpayPaymentId: string,
    signature: string,
    status: 'success' | 'failed',
    failureReason?: string
  ): Promise<void> {
    try {
      await query(
        `UPDATE payments 
         SET razorpay_payment_id = $2, razorpay_signature = $3, status = $4, failure_reason = $5, updated_at = NOW()
         WHERE id = $1`,
        [paymentId, razorpayPaymentId, signature, status, failureReason || null]
      );
    } catch (error) {
      console.error('Error updating payment record:', error);
    }
  }

  // Get payment history for user
  async getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
    try {
      const result = await query(
        `SELECT p.*, r.pickup_location, r.destination_location, r.ride_type
         FROM payments p
         JOIN rides r ON p.ride_id = r.id
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data.map((payment: any) => ({
        ...payment,
        pickup_location: JSON.parse(payment.pickup_location),
        destination_location: JSON.parse(payment.destination_location),
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  // Refund payment
  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<boolean> {
    try {
      // Get payment details
      const paymentResult = await query(
        'SELECT * FROM payments WHERE razorpay_payment_id = $1',
        [paymentId]
      );

      if (paymentResult.error || !paymentResult.data || paymentResult.data.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentResult.data[0];
      const refundAmount = amount || payment.amount;

      // Create refund via Razorpay API
      const refundData = {
        amount: Math.round(refundAmount * 100), // Convert to paise
        speed: 'normal',
        notes: {
          reason: reason || 'Ride cancelled',
          refund_type: 'full',
        },
      };

      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.razorpayKeyId}:${this.razorpayKeySecret}`)}`,
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const refund = await response.json();
      console.log('Refund created:', refund);

      // Update payment record
      await query(
        `UPDATE payments 
         SET status = $1, refund_id = $2, refund_amount = $3, updated_at = NOW()
         WHERE razorpay_payment_id = $4`,
        ['refunded', refund.id, refundAmount, paymentId]
      );

      // Notify user about refund
      await notificationService.sendPushNotificationToUser(payment.user_id, {
        type: 'payment',
        title: '💰 Refund Processed',
        body: `₹${refundAmount} has been refunded to your account.`,
        data: { refundAmount, refundId: refund.id },
      });

      return true;
    } catch (error) {
      console.error('Error processing refund:', error);
      return false;
    }
  }

  // Save user payment method
  async savePaymentMethod(
    userId: string,
    methodType: string,
    provider: string,
    token: string,
    metadata: any = {}
  ): Promise<boolean> {
    try {
      const result = await query(
        `INSERT INTO user_payment_methods (user_id, method_type, provider, token, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, methodType, provider, token, JSON.stringify(metadata)]
      );

      return !result.error;
    } catch (error) {
      console.error('Error saving payment method:', error);
      return false;
    }
  }

  // Get user payment methods
  async getUserPaymentMethods(userId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM user_payment_methods 
         WHERE user_id = $1 AND is_active = true
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data.map((method: any) => ({
        ...method,
        metadata: JSON.parse(method.metadata || '{}'),
      }));
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }

  // Calculate ride fare (can be expanded with complex pricing logic)
  calculateFare(distance: number, rideType: string, surge: number = 1): number {
    const baseFares = {
      economy: { base: 50, perKm: 12 },
      comfort: { base: 80, perKm: 15 },
      premium: { base: 120, perKm: 20 },
      xl: { base: 100, perKm: 18 },
    };

    const fare = baseFares[rideType as keyof typeof baseFares] || baseFares.economy;
    const totalFare = (fare.base + (distance * fare.perKm)) * surge;
    
    return Math.round(totalFare);
  }

  // Get payment analytics for a user
  async getPaymentAnalytics(userId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total_payments,
           SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_spent,
           SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) as total_refunded,
           AVG(CASE WHEN status = 'success' THEN amount ELSE NULL END) as avg_ride_cost
         FROM payments 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data[0] || {
        total_payments: 0,
        total_spent: 0,
        total_refunded: 0,
        avg_ride_cost: 0,
      };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      return {
        total_payments: 0,
        total_spent: 0,
        total_refunded: 0,
        avg_ride_cost: 0,
      };
    }
  }
}

// Create singleton instance
export const paymentService = new PaymentService();

// Export types
export type { PaymentOptions, PaymentResult, PaymentRecord, RazorpayOrder };