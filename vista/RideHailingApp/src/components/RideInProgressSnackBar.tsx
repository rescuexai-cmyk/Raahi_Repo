import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRide } from '../context/RideContext';

const { width: screenWidth } = Dimensions.get('window');

interface RideInProgressSnackBarProps {
  onPress: () => void;
}

const RideInProgressSnackBar: React.FC<RideInProgressSnackBarProps> = ({ onPress }) => {
  const { activeRide, isRideActive } = useRide();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRideActive && activeRide) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Start pulse animation for the status indicator
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRideActive, activeRide]);

  const getStatusInfo = () => {
    if (!activeRide) return { text: '', color: '#22C55E', icon: 'car-outline' as const };

    switch (activeRide.status) {
      case 'requested':
        return { 
          text: 'Finding driver...', 
          color: '#F59E0B', 
          icon: 'search-outline' as const 
        };
      case 'accepted':
      case 'driver_arriving':
        return { 
          text: `${activeRide.driverName} is on the way`, 
          color: '#22C55E', 
          icon: 'car-outline' as const 
        };
      case 'driver_arrived':
        return { 
          text: `${activeRide.driverName} has arrived`, 
          color: '#3B82F6', 
          icon: 'location-outline' as const 
        };
      case 'in_progress':
        return { 
          text: 'Ride in progress', 
          color: '#8B5CF6', 
          icon: 'navigate-outline' as const 
        };
      default:
        return { 
          text: 'Ride active', 
          color: '#22C55E', 
          icon: 'car-outline' as const 
        };
    }
  };

  const getRouteInfo = () => {
    if (!activeRide) return '';
    
    // Show destination for in-progress rides, pickup for others
    if (activeRide.status === 'in_progress') {
      return `To: ${activeRide.destinationAddress}`;
    } else {
      return `From: ${activeRide.pickupAddress}`;
    }
  };

  if (!isRideActive || !activeRide) {
    return null;
  }

  const statusInfo = getStatusInfo();
  const routeInfo = getRouteInfo();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.snackBar,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.content}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {/* Status Indicator */}
          <Animated.View
            style={[
              styles.statusIndicator,
              { 
                backgroundColor: statusInfo.color,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons name={statusInfo.icon} size={16} color="#FFF" />
          </Animated.View>

          {/* Ride Info */}
          <View style={styles.rideInfo}>
            <Text style={styles.statusText} numberOfLines={1}>
              {statusInfo.text}
            </Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {routeInfo}
            </Text>
          </View>

          {/* Vehicle Info */}
          {activeRide.vehicleInfo && (
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText} numberOfLines={1}>
                {activeRide.vehicleInfo}
              </Text>
            </View>
          )}

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-up" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { backgroundColor: statusInfo.color }
            ]} 
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  snackBar: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 70,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rideInfo: {
    flex: 1,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  routeText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  vehicleInfo: {
    marginRight: 8,
  },
  vehicleText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#F0F0F0',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    opacity: 0.8,
  },
});

export default RideInProgressSnackBar;