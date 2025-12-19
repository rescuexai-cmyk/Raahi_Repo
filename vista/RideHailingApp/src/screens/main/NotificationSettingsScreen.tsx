import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'ride' | 'payment' | 'driver' | 'general';
}

const NotificationSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const defaultSettings: NotificationSetting[] = [
    {
      id: 'ride_status',
      title: 'Ride Status Updates',
      description: 'Get notified when your ride status changes',
      icon: 'car-outline',
      enabled: true,
      category: 'ride',
    },
    {
      id: 'driver_found',
      title: 'Driver Found',
      description: 'Notification when a driver accepts your ride',
      icon: 'person-outline',
      enabled: true,
      category: 'ride',
    },
    {
      id: 'driver_arriving',
      title: 'Driver Arriving',
      description: 'Alert when your driver is arriving',
      icon: 'location-outline',
      enabled: true,
      category: 'ride',
    },
    {
      id: 'ride_reminders',
      title: 'Ride Reminders',
      description: 'Reminders about upcoming rides',
      icon: 'time-outline',
      enabled: true,
      category: 'ride',
    },
    {
      id: 'payment_success',
      title: 'Payment Confirmations',
      description: 'Confirmation when payments are processed',
      icon: 'card-outline',
      enabled: true,
      category: 'payment',
    },
    {
      id: 'payment_failed',
      title: 'Payment Failures',
      description: 'Alert when payments fail',
      icon: 'alert-circle-outline',
      enabled: true,
      category: 'payment',
    },
    {
      id: 'refund_updates',
      title: 'Refund Updates',
      description: 'Updates about refund processing',
      icon: 'refresh-outline',
      enabled: true,
      category: 'payment',
    },
    {
      id: 'new_ride_requests',
      title: 'New Ride Requests',
      description: 'Notifications for new ride requests (Drivers only)',
      icon: 'notifications-outline',
      enabled: true,
      category: 'driver',
    },
    {
      id: 'earnings_updates',
      title: 'Earnings Updates',
      description: 'Daily/weekly earnings summary (Drivers only)',
      icon: 'trending-up-outline',
      enabled: true,
      category: 'driver',
    },
    {
      id: 'promotional_offers',
      title: 'Promotional Offers',
      description: 'Special offers and discounts',
      icon: 'gift-outline',
      enabled: false,
      category: 'general',
    },
    {
      id: 'app_updates',
      title: 'App Updates',
      description: 'Information about new features and updates',
      icon: 'download-outline',
      enabled: false,
      category: 'general',
    },
  ];

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      
      // Get current push token
      const token = notificationService.getPushToken();
      setPushToken(token);
      
      // Load saved settings from AsyncStorage
      const savedSettings = await AsyncStorage.getItem('notification_settings');
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } else {
        // Filter settings based on user type
        const filteredSettings = defaultSettings.filter(setting => {
          if (setting.category === 'driver' && user?.user_type !== 'driver') {
            return false;
          }
          return true;
        });
        setSettings(filteredSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async (updatedSettings: NotificationSetting[]) => {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const toggleSetting = async (settingId: string) => {
    const updatedSettings = settings.map(setting => {
      if (setting.id === settingId) {
        return { ...setting, enabled: !setting.enabled };
      }
      return setting;
    });
    
    await saveNotificationSettings(updatedSettings);
  };

  const enableAllNotifications = async () => {
    const updatedSettings = settings.map(setting => ({ ...setting, enabled: true }));
    await saveNotificationSettings(updatedSettings);
  };

  const disableAllNotifications = async () => {
    const updatedSettings = settings.map(setting => ({ ...setting, enabled: false }));
    await saveNotificationSettings(updatedSettings);
  };

  const reinitializeNotifications = async () => {
    try {
      setLoading(true);
      
      const token = await notificationService.initialize();
      if (token && user) {
        await notificationService.savePushToken(user.id);
        setPushToken(token);
        Alert.alert('Success', 'Notifications have been reinitialized successfully');
      } else {
        Alert.alert('Error', 'Failed to initialize notifications. Please check your permissions.');
      }
    } catch (error) {
      console.error('Error reinitializing notifications:', error);
      Alert.alert('Error', 'Failed to reinitialize notifications');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendLocalNotification({
        type: 'general',
        title: '🧪 Test Notification',
        body: 'This is a test notification to verify that notifications are working correctly.',
        data: { test: true },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const renderSettingsByCategory = (category: string, title: string) => {
    const categorySettings = settings.filter(setting => setting.category === category);
    
    if (categorySettings.length === 0) return null;

    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{title}</Text>
        {categorySettings.map(renderSetting)}
      </View>
    );
  };

  const renderSetting = (setting: NotificationSetting) => (
    <View key={setting.id} style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Ionicons
          name={setting.icon as any}
          size={24}
          color="#007AFF"
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{setting.title}</Text>
          <Text style={styles.settingDescription}>{setting.description}</Text>
        </View>
      </View>
      <Switch
        value={setting.enabled}
        onValueChange={() => toggleSetting(setting.id)}
        trackColor={{ false: '#DDD', true: '#007AFF' }}
        thumbColor={setting.enabled ? '#FFF' : '#FFF'}
      />
    </View>
  );

  const renderNotificationStatus = () => (
    <View style={styles.statusContainer}>
      <View style={styles.statusHeader}>
        <Ionicons
          name={pushToken ? 'checkmark-circle' : 'alert-circle'}
          size={24}
          color={pushToken ? '#4CAF50' : '#F44336'}
        />
        <Text style={styles.statusTitle}>
          {pushToken ? 'Notifications Enabled' : 'Notifications Disabled'}
        </Text>
      </View>
      
      <Text style={styles.statusDescription}>
        {pushToken
          ? 'Push notifications are working correctly'
          : 'Push notifications are not available. Please enable them in your device settings.'}
      </Text>
      
      {pushToken && (
        <Text style={styles.tokenText}>
          Token: {pushToken.substring(0, 20)}...
        </Text>
      )}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={enableAllNotifications}>
        <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
        <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
          Enable All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={disableAllNotifications}>
        <Ionicons name="close-circle-outline" size={20} color="#F44336" />
        <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
          Disable All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={testNotification}>
        <Ionicons name="play-circle-outline" size={20} color="#FF9800" />
        <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>
          Test
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={reinitializeNotifications}>
        <Ionicons name="refresh-circle-outline" size={20} color="#2196F3" />
        <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>
          Reinitialize
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderNotificationStatus()}
        {renderActionButtons()}
        
        {renderSettingsByCategory('ride', 'Ride Notifications')}
        {renderSettingsByCategory('payment', 'Payment Notifications')}
        {user?.user_type === 'driver' && renderSettingsByCategory('driver', 'Driver Notifications')}
        {renderSettingsByCategory('general', 'General Notifications')}
        
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Changes to notification settings take effect immediately. You can test notifications
            using the "Test" button above.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    lineHeight: 16,
  },
});

export default NotificationSettingsScreen;