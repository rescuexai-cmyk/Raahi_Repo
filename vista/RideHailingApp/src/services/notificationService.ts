import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { query } from './database';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationData {
  type: 'ride_status' | 'driver_found' | 'ride_request' | 'payment' | 'message' | 'general';
  rideId?: string;
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // Initialize push notifications
  async initialize(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Get existing token from storage
      const storedToken = await AsyncStorage.getItem('expo_push_token');
      if (storedToken) {
        this.expoPushToken = storedToken;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get push token
      const token = await this.getExpoPushToken();
      
      if (token) {
        this.expoPushToken = token;
        await AsyncStorage.setItem('expo_push_token', token);
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('ride-updates', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('driver-notifications', {
          name: 'Driver Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FF00',
        });

        await Notifications.setNotificationChannelAsync('payment-notifications', {
          name: 'Payment Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0000FF',
        });
      }

      // Set up listeners
      this.setupListeners();

      return this.expoPushToken;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  // Get Expo push token
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id';
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Set up notification listeners
  private setupListeners() {
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received while app is running
  private handleNotificationReceived(notification: Notifications.Notification) {
    const { type, rideId } = notification.request.content.data as any;
    
    // You can add custom logic here based on notification type
    switch (type) {
      case 'ride_status':
        console.log(`Ride ${rideId} status updated`);
        break;
      case 'driver_found':
        console.log(`Driver found for ride ${rideId}`);
        break;
      case 'ride_request':
        console.log('New ride request received');
        break;
      default:
        console.log('General notification received');
    }
  }

  // Handle notification tap/response
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { type, rideId } = response.notification.request.content.data as any;
    
    // Navigate to appropriate screen based on notification type
    switch (type) {
      case 'ride_status':
      case 'driver_found':
        if (rideId) {
          // Navigate to ride details screen
          console.log(`Navigate to ride ${rideId}`);
        }
        break;
      case 'ride_request':
        // Navigate to driver dashboard
        console.log('Navigate to driver dashboard');
        break;
      case 'payment':
        // Navigate to payment screen
        console.log('Navigate to payment screen');
        break;
      default:
        // Navigate to home screen
        console.log('Navigate to home screen');
    }
  }

  // Send local notification
  async sendLocalNotification(data: NotificationData): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: data.type,
            rideId: data.rideId,
            ...data.data,
          },
          sound: true,
        },
        trigger: null, // Send immediately
      });

      console.log('Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return null;
    }
  }

  // Send push notification to user (server-side functionality)
  async sendPushNotificationToUser(userId: string, data: NotificationData): Promise<boolean> {
    try {
      // Get user's push token from database
      const result = await query(
        'SELECT push_token FROM users WHERE id = $1',
        [userId]
      );

      if (result.error || !result.data || result.data.length === 0) {
        console.error('User not found or no push token');
        return false;
      }

      const pushToken = result.data[0].push_token;
      if (!pushToken) {
        console.warn('User has no push token');
        return false;
      }

      // Send push notification via Expo's push service
      const message = {
        to: pushToken,
        sound: 'default',
        title: data.title,
        body: data.body,
        data: {
          type: data.type,
          rideId: data.rideId,
          ...data.data,
        },
        channelId: this.getChannelId(data.type),
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      
      if (responseData.data && responseData.data[0] && responseData.data[0].status === 'ok') {
        console.log('Push notification sent successfully');
        return true;
      } else {
        console.error('Failed to send push notification:', responseData);
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Get appropriate notification channel ID
  private getChannelId(type: string): string {
    switch (type) {
      case 'ride_status':
      case 'driver_found':
        return 'ride-updates';
      case 'ride_request':
        return 'driver-notifications';
      case 'payment':
        return 'payment-notifications';
      default:
        return 'default';
    }
  }

  // Save user's push token to database
  async savePushToken(userId: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        console.warn('No push token available');
        return false;
      }

      const result = await query(
        'UPDATE users SET push_token = $1, updated_at = NOW() WHERE id = $2',
        [this.expoPushToken, userId]
      );

      if (result.error) {
        console.error('Error saving push token:', result.error);
        return false;
      }

      console.log('Push token saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  }

  // Remove push token from database (on logout)
  async removePushToken(userId: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE users SET push_token = NULL, updated_at = NOW() WHERE id = $2',
        [userId]
      );

      if (result.error) {
        console.error('Error removing push token:', result.error);
        return false;
      }

      console.log('Push token removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing push token:', error);
      return false;
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Clear badge count
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  // Cleanup listeners
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Ride-specific notification helpers
  async notifyRideStatusUpdate(userId: string, rideId: string, status: string): Promise<boolean> {
    const statusMessages = {
      accepted: {
        title: '🚗 Ride Accepted!',
        body: 'Your driver is on the way. Track your ride in real-time.',
      },
      arriving: {
        title: '📍 Driver Arriving',
        body: 'Your driver is almost there. Please be ready.',
      },
      in_progress: {
        title: '🛣️ Ride Started',
        body: 'Your ride has started. Enjoy your journey!',
      },
      completed: {
        title: '✅ Ride Completed',
        body: 'You have reached your destination. Please rate your driver.',
      },
      cancelled: {
        title: '❌ Ride Cancelled',
        body: 'Your ride has been cancelled. Book another ride anytime.',
      },
    };

    const message = statusMessages[status as keyof typeof statusMessages];
    if (!message) return false;

    return await this.sendPushNotificationToUser(userId, {
      type: 'ride_status',
      rideId,
      title: message.title,
      body: message.body,
      data: { status },
    });
  }

  async notifyDriverFound(userId: string, rideId: string, driverName: string, eta: number): Promise<boolean> {
    return await this.sendPushNotificationToUser(userId, {
      type: 'driver_found',
      rideId,
      title: '🚙 Driver Found!',
      body: `${driverName} will pick you up in ${eta} minutes.`,
      data: { driverName, eta },
    });
  }

  async notifyNewRideRequest(driverId: string, pickupLocation: string, fare: number): Promise<boolean> {
    return await this.sendPushNotificationToUser(driverId, {
      type: 'ride_request',
      title: '🔔 New Ride Request',
      body: `Pickup from ${pickupLocation}. Fare: ₹${fare}`,
      data: { pickupLocation, fare },
    });
  }

  async notifyPaymentSuccess(userId: string, amount: number): Promise<boolean> {
    return await this.sendPushNotificationToUser(userId, {
      type: 'payment',
      title: '💳 Payment Successful',
      body: `₹${amount} has been charged successfully.`,
      data: { amount },
    });
  }

  async notifyPaymentFailed(userId: string, reason: string): Promise<boolean> {
    return await this.sendPushNotificationToUser(userId, {
      type: 'payment',
      title: '❌ Payment Failed',
      body: `Payment failed: ${reason}. Please try again.`,
      data: { reason },
    });
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export types
export type { NotificationData };