import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import DriverSignupCard, { DriverSignupData } from './DriverSignupCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService.mobile';

interface UserTypeToggleProps {
  currentUserType: 'rider' | 'driver';
  onUserTypeChange: (userType: 'rider' | 'driver') => void;
  showLabel?: boolean;
}

const UserTypeToggle: React.FC<UserTypeToggleProps> = ({
  currentUserType,
  onUserTypeChange,
  showLabel = true,
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDriverSignup, setShowDriverSignup] = useState(false);

  const handleToggle = () => {
    if (!user) return;

    // Check if user is registered as both rider and driver
    const canSwitchToDriver = user.user_type === 'driver' || user.user_type === 'both';
    const canSwitchToRider = user.user_type === 'rider' || user.user_type === 'both';

    const targetType = currentUserType === 'rider' ? 'driver' : 'rider';

    if (targetType === 'driver' && !canSwitchToDriver) {
      // Check if this is the first time switching to driver mode
      checkFirstTimeDriverToggle();
      return;
    }

    if (targetType === 'rider' && !canSwitchToRider) {
      Alert.alert(
        'Rider Registration Required',
        'You need to register as a rider to use rider features.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show confirmation modal
    setShowModal(true);
  };

  const confirmToggle = () => {
    setIsAnimating(true);
    setShowModal(false);

    const targetType = currentUserType === 'rider' ? 'driver' : 'rider';

    // Animate the toggle
    setTimeout(() => {
      onUserTypeChange(targetType);
      setIsAnimating(false);

      Alert.alert(
        `Switched to ${targetType === 'driver' ? 'Driver' : 'Rider'} Mode`,
        targetType === 'driver' 
          ? 'You can now receive ride requests and earn money!'
          : 'You can now book rides and track your trips!',
        [{ text: 'Got it' }]
      );
    }, 300);
  };

  /**
   * Check if this is the first time user is trying to switch to driver mode
   */
  const checkFirstTimeDriverToggle = async () => {
    try {
      const hasSeenDriverPrompt = await AsyncStorage.getItem('hasSeenDriverPrompt');
      
      if (!hasSeenDriverPrompt) {
        // First time - show driver signup card
        setShowDriverSignup(true);
        // Mark as seen
        await AsyncStorage.setItem('hasSeenDriverPrompt', 'true');
      } else {
        // Not first time - show basic registration prompt
        showDriverRegistration();
      }
    } catch (error) {
      console.error('Error checking first time driver toggle:', error);
      // Fallback to showing signup card
      setShowDriverSignup(true);
    }
  };

  const showDriverRegistration = () => {
    Alert.alert(
      'Driver Registration Required',
      'You need to complete driver registration to use driver features. Would you like to register now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Register as Driver', onPress: () => setShowDriverSignup(true) }
      ]
    );
  };

  /**
   * Handle successful driver signup
   */
  const handleDriverSignupComplete = async (driverData: DriverSignupData) => {
    try {
      console.log('🚗 Processing driver signup:', driverData);
      
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Save driver data to database
      const registrationResult = await driverService.registerDriver({
        userId: user.id,
        name: driverData.name,
        phone: driverData.phone,
        address: driverData.address,
        vehicleNumber: driverData.vehicleNumber,
        vehicleModel: driverData.vehicleName,
        vehicleType: 'economy',
        licenseNumber: 'DL123456',
        vehicleColor: driverData.vehicleColor,
      });

      if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Registration failed');
      }
      
      console.log('✅ Driver registration completed successfully');
      
      // Switch to driver mode
      setTimeout(() => {
        onUserTypeChange('driver');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error completing driver signup:', error);
      Alert.alert(
        'Registration Error',
        'There was an error completing your driver registration. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Handle driver signup decline
   */
  const handleDriverSignupDecline = () => {
    console.log('User declined driver signup');
    // User stays in current mode (rider)
  };

  const getToggleIcon = () => {
    if (isAnimating) {
      return 'sync';
    }
    return currentUserType === 'rider' ? 'person' : 'car';
  };

  const getToggleColor = () => {
    return currentUserType === 'rider' ? '#007AFF' : '#22C55E';
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, { borderColor: getToggleColor() }]}
        onPress={handleToggle}
        disabled={isAnimating}
      >
        <View style={[styles.iconContainer, { backgroundColor: getToggleColor() }]}>
          <Ionicons 
            name={getToggleIcon() as any} 
            size={16} 
            color="#FFF" 
          />
        </View>
        
        {showLabel && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: getToggleColor() }]}>
              {currentUserType === 'rider' ? 'Rider' : 'Driver'}
            </Text>
            <Text style={styles.sublabel}>
              Tap to switch
            </Text>
          </View>
        )}
        
        <Ionicons 
          name="chevron-down" 
          size={12} 
          color={getToggleColor()} 
        />
      </TouchableOpacity>

      {/* Switch Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={currentUserType === 'rider' ? 'car' : 'person'} 
                size={32} 
                color="#22C55E" 
              />
              <Text style={styles.modalTitle}>
                Switch to {currentUserType === 'rider' ? 'Driver' : 'Rider'} Mode?
              </Text>
            </View>

            <Text style={styles.modalDescription}>
              {currentUserType === 'rider' 
                ? 'You\'ll be able to receive ride requests and start earning money. Your current location will be shared with nearby riders.'
                : 'You\'ll be able to book rides and track your trips. You\'ll stop receiving driver requests.'
              }
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmToggle}
              >
                <Text style={styles.confirmText}>
                  Switch to {currentUserType === 'rider' ? 'Driver' : 'Rider'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Driver Signup Card */}
      <DriverSignupCard
        visible={showDriverSignup}
        onClose={() => setShowDriverSignup(false)}
        onSignupComplete={handleDriverSignupComplete}
        onDecline={handleDriverSignupDecline}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 10,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
  },
});

export default UserTypeToggle;