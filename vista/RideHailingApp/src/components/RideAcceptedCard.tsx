import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Driver, Ride } from '../types';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface RideAcceptedCardProps {
  visible: boolean;
  driver: Driver | null;
  ride: Ride | null;
  otp: string;
  estimatedArrival: number; // in minutes to pickup
  estimatedDestinationArrival?: number; // in minutes to destination
  isRideStarted: boolean; // determines if we show OTP or destination ETA
  onCall: () => void;
  onMessage: () => void;
  onCancel: () => void;
  onClose?: () => void;
}

const RideAcceptedCard: React.FC<RideAcceptedCardProps> = ({
  visible,
  driver,
  ride,
  otp,
  estimatedArrival,
  estimatedDestinationArrival,
  isRideStarted,
  onCall,
  onMessage,
  onCancel,
  onClose,
}) => {
  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      showCard();
      startPulseAnimation();
    } else {
      hideCard();
    }
  }, [visible]);

  const showCard = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideCard = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleCall = async () => {
    if (!driver?.phone) return;
    
    const phoneUrl = `tel:${driver.phone}`;
    const supported = await Linking.canOpenURL(phoneUrl);
    
    if (supported) {
      await Linking.openURL(phoneUrl);
      onCall();
    } else {
      Alert.alert('Error', 'Phone calls are not supported on this device');
    }
  };

  const handleMessage = async () => {
    if (!driver?.phone) return;
    
    const smsUrl = `sms:${driver.phone}`;
    const supported = await Linking.canOpenURL(smsUrl);
    
    if (supported) {
      await Linking.openURL(smsUrl);
      onMessage();
    } else {
      Alert.alert('Error', 'SMS is not supported on this device');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? You may be charged a cancellation fee.',
      [
        { text: 'No, Keep Ride', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: onCancel 
        }
      ]
    );
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType?.toLowerCase()) {
      case 'economy':
        return 'car-outline';
      case 'comfort':
        return 'car';
      case 'premium':
        return 'car-sport';
      case 'xl':
        return 'car-sport';
      default:
        return 'car-outline';
    }
  };

  const formatETA = (minutes: number): string => {
    if (minutes < 1) return 'Arriving now';
    if (minutes === 1) return '1 min away';
    return `${minutes} mins away`;
  };

  const getRideTypeColor = (rideType: string): string => {
    switch (rideType?.toLowerCase()) {
      case 'economy':
        return '#22C55E';
      case 'comfort':
        return '#3B82F6';
      case 'premium':
        return '#8B5CF6';
      case 'xl':
        return '#06B6D4';
      default:
        return '#22C55E';
    }
  };

  if (!visible || !driver || !ride) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: slideAnim }],
              height: isExpanded ? 'auto' : (isRideStarted ? 260 : 320),
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header with Status */}
          <View style={styles.header}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isRideStarted ? '#3B82F6' : '#22C55E' }]} />
              <Text style={styles.statusText}>
                {isRideStarted ? 'Ride in Progress' : 'Driver Assigned'}
              </Text>
            </View>
            <Text style={styles.etaText}>
              {isRideStarted ? 'En route' : formatETA(estimatedArrival)}
            </Text>
          </View>

          {/* Driver Information */}
          <View style={styles.driverSection}>
            <View style={styles.driverInfo}>
              <Image
                source={{ 
                  uri: driver.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(driver.name) + '&background=22C55E&color=fff&size=60'
                }}
                style={styles.driverAvatar}
              />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>{driver.rating}</Text>
                  <Text style={styles.totalRides}>• {driver.total_rides} rides</Text>
                </View>
                                 <View style={styles.vehicleInfo}>
                   <Ionicons 
                     name={getVehicleIcon(ride.ride_type)} 
                     size={16} 
                     color={getRideTypeColor(ride.ride_type)} 
                   />
                   <Text style={styles.vehicleText}>
                     {driver.vehicle_info?.color} {driver.vehicle_info?.model}
                   </Text>
                 </View>
              </View>
            </View>

                         {/* Vehicle Number & OTP */}
             <View style={styles.vehicleNumberContainer}>
               <Text style={styles.vehicleNumber}>{driver.vehicle_info?.license_plate}</Text>
             </View>
          </View>

          {/* OTP Section OR Destination ETA */}
          <Animated.View 
            style={[
              styles.otpSection,
              {
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            {!isRideStarted ? (
              // Show OTP before ride starts
              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>Share this OTP with driver</Text>
                <View style={styles.otpBox}>
                  <Text style={styles.otpText}>{otp}</Text>
                </View>
              </View>
            ) : (
              // Show destination ETA after ride starts
              <View style={styles.destinationEtaContainer}>
                <Text style={styles.destinationEtaLabel}>Arriving at destination</Text>
                <View style={styles.destinationEtaBox}>
                  <Ionicons name="location" size={20} color="#FFF" />
                  <Text style={styles.destinationEtaText}>
                    {formatETA(estimatedDestinationArrival || 0)}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Action Buttons - Only show before ride starts */}
          {!isRideStarted && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCall}
              >
                <Ionicons name="call" size={20} color="#FFF" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.messageButton}
                onPress={handleMessage}
              >
                <Ionicons name="chatbubble" size={20} color="#22C55E" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Ionicons name="close" size={20} color="#F44336" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Expandable Details */}
          {isExpanded && (
            <View style={styles.expandedDetails}>
              <View style={styles.rideDetails}>
                <Text style={styles.sectionTitle}>Ride Details</Text>
                
                <View style={styles.locationRow}>
                  <View style={styles.locationIcon}>
                    <View style={[styles.locationDot, { backgroundColor: '#22C55E' }]} />
                  </View>
                                     <View style={styles.locationText}>
                     <Text style={styles.locationLabel}>Pickup</Text>
                     <Text style={styles.locationAddress}>{ride.pickup_location.address}</Text>
                   </View>
                </View>

                <View style={styles.locationConnector} />

                <View style={styles.locationRow}>
                  <View style={styles.locationIcon}>
                    <View style={[styles.locationDot, { backgroundColor: '#F44336' }]} />
                  </View>
                                     <View style={styles.locationText}>
                     <Text style={styles.locationLabel}>Drop-off</Text>
                     <Text style={styles.locationAddress}>{ride.destination_location.address}</Text>
                   </View>
                </View>

                                 <View style={styles.fareContainer}>
                   <Text style={styles.fareLabel}>Estimated Fare</Text>
                   <Text style={styles.fareAmount}>₹{ride.fare}</Text>
                 </View>
              </View>
            </View>
          )}

          {/* Expand/Collapse Button */}
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={toggleExpanded}
          >
            <Ionicons 
              name={isExpanded ? "chevron-down" : "chevron-up"} 
              size={24} 
              color="#666" 
            />
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Show Less' : 'Show More'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: screenHeight * 0.85,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  etaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#F0F0F0',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  totalRides: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  vehicleNumberContainer: {
    alignSelf: 'flex-end',
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  otpSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpContainer: {
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  otpBox: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 3,
  },
  destinationEtaContainer: {
    alignItems: 'center',
  },
  destinationEtaLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  destinationEtaBox: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    gap: 8,
  },
  destinationEtaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  messageButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  expandedDetails: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rideDetails: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginLeft: 17,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
});

export default RideAcceptedCard;