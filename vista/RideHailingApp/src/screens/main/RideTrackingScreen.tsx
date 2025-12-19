import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomMapView from '../../components/MapView';
import { googleMapsService, LocationCoordinate } from '../../services/mapsService';
import { driverService, Driver as MobileDriver } from '../../services/driverService.mobile';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import { RideStatus } from '../../types';
import * as Location from 'expo-location';
import RideAcceptedCard from '../../components/RideAcceptedCard';

interface RideDetails {
  rideId: string;
  rideType: string;
  pickupLocation: LocationCoordinate;
  destinationLocation: LocationCoordinate;
  pickupAddress: string;
  destinationAddress: string;
  assignedDriver?: MobileDriver;
  fare: number;
}



const RideTrackingScreen: React.FC = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { setActiveRide, updateRideStatus, clearActiveRide } = useRide();
  const { rideDetails } = route.params as { rideDetails: RideDetails };

  // Core state
  const [rideStatus, setRideStatus] = useState<RideStatus>('requested');
  const [currentDriverLocation, setCurrentDriverLocation] = useState<LocationCoordinate | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<number>(0);
  const [routeToPickup, setRouteToPickup] = useState<any>(null);
  const [routeToDestination, setRouteToDestination] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<'pickup' | 'destination' | null>('pickup');

  // OTP and verification
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [userOTP, setUserOTP] = useState('');
  const [driverOTP, setDriverOTP] = useState('');
  const [rideOTP, setRideOTP] = useState('');

  // Animation and UI
  const [cardAnimation] = useState(new Animated.Value(0));
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showRideAcceptedCard, setShowRideAcceptedCard] = useState(false);
  const [destinationETA, setDestinationETA] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeRideTracking();
    generateRideOTP();
    startDriverLocationTracking();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    handleRideStatusChange();
  }, [rideStatus]);

  /**
   * Initialize ride tracking and simulate driver acceptance
   */
  const initializeRideTracking = async () => {
    try {
      console.log('🚗 Initializing ride tracking for:', rideDetails.rideId);
      
      // Set active ride in context
      await setActiveRide({
        rideId: rideDetails.rideId,
        status: 'requested',
        driverName: rideDetails.assignedDriver?.name || 'Driver',
        vehicleInfo: rideDetails.assignedDriver?.vehicle_info?.plateNumber || 'Vehicle',
        pickupAddress: rideDetails.pickupAddress,
        destinationAddress: rideDetails.destinationAddress,
        startedAt: new Date().toISOString(),
      });
      
      // Simulate driver acceptance after 3 seconds
      setTimeout(() => {
        simulateDriverAcceptance();
      }, 3000);

      // Show initial animation
      Animated.spring(cardAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error initializing ride tracking:', error);
    }
  };

  /**
   * Generate OTP for ride verification
   */
  const generateRideOTP = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setRideOTP(otp);
    console.log('🔐 Generated ride OTP for user:', otp);
    console.log('📱 User will share this OTP with driver who will enter it in driver app');
  };

  /**
   * Simulate driver acceptance and start tracking
   */
  const simulateDriverAcceptance = async () => {
    try {
      console.log('✅ Driver accepted the ride');
      setRideStatus('accepted');
      await updateRideStatus('accepted');
      
      // IMMEDIATELY calculate and show route to pickup in user's app
      console.log('🗺️ Calculating route to pickup for user to see...');
      await calculateRouteToPickup();
      
      // Show the beautiful ride accepted card instead of basic alert
      setShowRideAcceptedCard(true);

      // Set status to driver arriving (route now visible to user)
      setRideStatus('driver_arriving');
      await updateRideStatus('driver_arriving');

    } catch (error) {
      console.error('Error in driver acceptance:', error);
    }
  };

  /**
   * Start tracking driver location every 5 seconds
   */
  const startDriverLocationTracking = () => {
    // Simulate driver starting from a random nearby location
    const randomOffset = 0.01; // ~1km
    const startLocation = {
      lat: rideDetails.pickupLocation.lat + (Math.random() - 0.5) * randomOffset,
      lng: rideDetails.pickupLocation.lng + (Math.random() - 0.5) * randomOffset,
    };
    
    setCurrentDriverLocation(startLocation);

    // Update driver location every 5 seconds
    intervalRef.current = setInterval(async () => {
      await updateDriverLocation();
    }, 5000);
  };

  /**
   * Update driver location and route progress
   */
  const updateDriverLocation = async () => {
    if (!currentDriverLocation) return;

    try {
      const targetLocation = activeRoute === 'pickup' 
        ? rideDetails.pickupLocation 
        : rideDetails.destinationLocation;

      // Calculate movement towards target (simulate driver moving)
      const progress = 0.1; // Move 10% closer each update
      const newLocation = {
        lat: currentDriverLocation.lat + (targetLocation.lat - currentDriverLocation.lat) * progress,
        lng: currentDriverLocation.lng + (targetLocation.lng - currentDriverLocation.lng) * progress,
      };

      setCurrentDriverLocation(newLocation);

      // Check if driver arrived at pickup
      if (activeRoute === 'pickup') {
        const distanceToPickup = googleMapsService.calculateDistance(
          newLocation.lat,
          newLocation.lng,
          rideDetails.pickupLocation.lat,
          rideDetails.pickupLocation.lng
        );

                  if (distanceToPickup * 1000 < 50) { // Within 50 meters (convert km to meters)
          handleDriverArrivedAtPickup();
        } else {
          // Update ETA
          const route = await googleMapsService.getDirections(newLocation, rideDetails.pickupLocation);
          if (route) {
            setEstimatedArrival(Math.round(route.duration.value / 60));
          }
        }
      }

      // Check if arrived at destination
      if (activeRoute === 'destination') {
        const distanceToDestination = googleMapsService.calculateDistance(
          newLocation.lat,
          newLocation.lng,
          rideDetails.destinationLocation.lat,
          rideDetails.destinationLocation.lng
        );

        if (distanceToDestination * 1000 < 50) { // Within 50 meters (convert km to meters)
          handleRideCompleted();
        } else {
          // Update destination ETA
          const route = await googleMapsService.getDirections(newLocation, rideDetails.destinationLocation);
          if (route) {
            setDestinationETA(Math.round(route.duration.value / 60));
          }
        }
      }

    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  /**
   * Calculate route from driver to pickup location
   */
  const calculateRouteToPickup = async () => {
    if (!currentDriverLocation) return;

    try {
      setIsLoadingRoute(true);
      console.log('🗺️ Calculating route from driver to pickup for user to see...');
      
      const route = await googleMapsService.getDirections(
        currentDriverLocation,
        rideDetails.pickupLocation
      );

      if (route) {
        setRouteToPickup(route);
        setEstimatedArrival(Math.round(route.duration.value / 60));
        console.log('✅ Route to pickup visible to user, ETA:', route.duration.text);
        console.log('👀 User can now see the blue route line on map showing driver\'s path');
      }
    } catch (error) {
      console.error('Error calculating route to pickup:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  /**
   * Calculate route from pickup to destination
   */
  const calculateRouteToDestination = async () => {
    try {
      setIsLoadingRoute(true);
      const route = await googleMapsService.getDirections(
        rideDetails.pickupLocation,
        rideDetails.destinationLocation
      );

      if (route) {
        setRouteToDestination(route);
        console.log('🗺️ Route to destination calculated');
      }
    } catch (error) {
      console.error('Error calculating route to destination:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  /**
   * Handle driver arrived at pickup location
   */
  const handleDriverArrivedAtPickup = async () => {
    setRideStatus('driver_arriving');
    await updateRideStatus('driver_arriving');
    setActiveRoute(null);

    // Stop location updates temporarily
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Keep the ride accepted card visible - don't hide it!
    // The card will show OTP until ride starts

    // Show arrival notification
    Alert.alert(
      '🎉 Your Ride Has Arrived!',
      `${rideDetails.assignedDriver?.name || 'Your driver'} is at your pickup location.\n\nVehicle: ${rideDetails.assignedDriver?.vehicle_info?.plateNumber}\n\n🔐 Please share your OTP with the driver: ${rideOTP}`,
      [
        {
          text: '📱 Call Driver',
          onPress: () => console.log('Call driver')
        },
        {
          text: '🚗 Ready to Start',
          onPress: () => setShowOTPModal(true)
        }
      ]
    );
  };

  /**
   * Handle OTP verification and start ride
   */
  const handleOTPVerification = async () => {
    if (driverOTP !== rideOTP) {
      Alert.alert('❌ Invalid OTP', 'The driver entered an incorrect OTP. Please verify the OTP with your driver.');
      return;
    }

    try {
      console.log('✅ Driver entered correct OTP, starting ride');
      setShowOTPModal(false);
      setRideStatus('in_progress');
      await updateRideStatus('in_progress');

      // Calculate route to destination
      await calculateRouteToDestination();
      setActiveRoute('destination');

      // Calculate initial destination ETA
      const route = await googleMapsService.getDirections(
        rideDetails.pickupLocation,
        rideDetails.destinationLocation
      );
      if (route) {
        setDestinationETA(Math.round(route.duration.value / 60));
      }

      // Resume location tracking towards destination
      startDestinationTracking();

      Alert.alert(
        '🚗 Ride Started!',
        'Your driver has verified the OTP and your ride has begun. You can now track your progress to the destination.',
        [{ text: 'Track Ride' }]
      );

    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride. Please try again.');
    }
  };

  /**
   * Start tracking towards destination
   */
  const startDestinationTracking = () => {
    // Update current driver location to pickup location
    setCurrentDriverLocation(rideDetails.pickupLocation);

    // Start tracking towards destination
    intervalRef.current = setInterval(async () => {
      await updateDriverLocation();
    }, 3000); // Faster updates during ride
  };

  /**
   * Handle ride completion
   */
  const handleRideCompleted = async () => {
    setRideStatus('completed');
    await updateRideStatus('completed');
    setActiveRoute(null);

    // Stop location tracking
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Clear active ride from context
    await clearActiveRide();

    Alert.alert(
      '🎉 Ride Completed!',
      `You have arrived at your destination.\n\nFare: ₹${rideDetails.fare}\nThank you for riding with us!`,
      [
        {
          text: '⭐ Rate Driver',
          onPress: () => navigation.navigate('RateDriver', { 
            driverId: rideDetails.assignedDriver?.id,
            rideId: rideDetails.rideId 
          })
        },
        {
          text: '🏠 Go Home',
          onPress: () => navigation.navigate('Home')
        }
      ]
    );
  };

  /**
   * Handle different ride status changes
   */
  const handleRideStatusChange = () => {
    switch (rideStatus) {
      case 'requested':
        console.log('🔍 Looking for drivers...');
        break;
      case 'accepted':
        console.log('✅ Driver accepted, routing to pickup');
        break;
      case 'driver_arriving':
        console.log('🚗 Driver arriving at pickup');
        console.log('📍 Driver arrived at pickup');
        break;
      case 'in_progress':
        console.log('🎯 Ride in progress to destination');
        break;
      case 'completed':
        console.log('🎉 Ride completed successfully');
        break;
    }
  };

  /**
   * Cancel ride
   */
  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride?',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setRideStatus('cancelled');
            await updateRideStatus('cancelled');
            await clearActiveRide();
            
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const getStatusInfo = () => {
    switch (rideStatus) {
      case 'requested':
        return {
          title: '🔍 Finding Driver',
          subtitle: 'Looking for nearby drivers...',
          color: '#FF9500'
        };
      case 'accepted':
        return {
          title: '✅ Driver Accepted',
          subtitle: `${rideDetails.assignedDriver?.name} is coming to pick you up`,
          color: '#007AFF'
        };
      case 'driver_arriving':
        return {
          title: '🚗 Driver Arriving',
          subtitle: `ETA: ${estimatedArrival} minutes`,
          color: '#007AFF'
        };
      case 'driver_arriving':
        return {
          title: '📍 Driver Arrived',
          subtitle: 'Your driver is at the pickup location',
          color: '#4CAF50'
        };
      case 'in_progress':
        return {
          title: '🎯 Ride in Progress',
          subtitle: 'Heading to destination',
          color: '#4CAF50'
        };
      case 'completed':
        return {
          title: '🎉 Ride Completed',
          subtitle: 'You have arrived at your destination',
          color: '#4CAF50'
        };
      default:
        return {
          title: '🚗 Ride Tracking',
          subtitle: 'Tracking your ride...',
          color: '#007AFF'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Map View */}
      <CustomMapView
        drivers={currentDriverLocation ? [{
          id: 'current_driver',
          name: rideDetails.assignedDriver?.name || 'Driver',
          phone: '',
          email: '',
          rating: rideDetails.assignedDriver?.rating || 5.0,
          status: 'busy' as const,
          total_rides: 0,
          vehicle_info: rideDetails.assignedDriver?.vehicle_info || { type: 'economy', model: 'Car', color: 'White', plateNumber: '' },
          license_number: '',
          is_verified: true,
          is_available: false,
          current_location: {
            lat: currentDriverLocation.lat,
            lng: currentDriverLocation.lng
          },
          user_type: 'driver' as const,
          created_at: '',
          updated_at: ''
        }] : []}
        pickupLocation={rideDetails.pickupLocation}
        dropoffLocation={rideDetails.destinationLocation}
        currentUserLocation={rideDetails.pickupLocation}
        userType="rider"
        showUserLocation={true}
        followUserLocation={false}
        showTraffic={true}
        routeCoordinates={activeRoute === 'pickup' ? routeToPickup?.coordinates : routeToDestination?.coordinates}
        onLocationPress={() => {}}
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.rideInfo}>
          <Text style={styles.rideId}>Ride #{rideDetails.rideId.slice(-6)}</Text>
          <Text style={styles.rideType}>{rideDetails.rideType}</Text>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
          <Ionicons name="close" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {/* Bottom Status Card */}
      <Animated.View
        style={[
          styles.statusCard,
          {
            transform: [{
              translateY: cardAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              })
            }]
          }
        ]}
      >
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
          </View>
          {rideStatus === 'driver_arriving' && (
            <Text style={styles.etaText}>{estimatedArrival} min</Text>
          )}
        </View>

        {/* Driver Information */}
        {rideDetails.assignedDriver && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {rideDetails.assignedDriver.name}
                {rideDetails.assignedDriver.is_verified && ' ✅'}
              </Text>
              <Text style={styles.vehicleInfo}>
                                  {rideDetails.assignedDriver.vehicle_info?.color} {rideDetails.assignedDriver.vehicle_info?.type}
              </Text>
              <Text style={styles.plateNumber}>
                                  {rideDetails.assignedDriver.vehicle_info?.plateNumber}
              </Text>
            </View>
            
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="call" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Information */}
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {rideDetails.pickupAddress}
            </Text>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {rideDetails.destinationAddress}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {rideStatus === 'driver_arriving' && (
          <TouchableOpacity 
            style={styles.startRideButton}
            onPress={() => setShowOTPModal(true)}
          >
            <Text style={styles.startRideButtonText}>🔐 Share OTP with Driver</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* OTP Modal */}
      <Modal
        visible={showOTPModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>🔐 Waiting for Driver to Enter OTP</Text>
            <Text style={styles.otpSubtitle}>
              Your OTP: {rideOTP}
            </Text>
            <Text style={styles.otpInstructions}>
              📱 Share this OTP with your driver. The driver will enter it in their app to start the ride.
            </Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="Driver will enter: ****"
              value={driverOTP}
              onChangeText={setDriverOTP}
              keyboardType="numeric"
              maxLength={4}
              autoFocus={true}
            />
            
            <View style={styles.otpActions}>
              <TouchableOpacity 
                style={styles.otpCancelButton}
                onPress={() => setShowOTPModal(false)}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.otpConfirmButton}
                onPress={handleOTPVerification}
              >
                <Text style={styles.otpConfirmText}>Start Ride with Raahi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ride Accepted Card */}
      <RideAcceptedCard
        visible={showRideAcceptedCard}
        driver={rideDetails.assignedDriver as any || null}
        ride={{
          id: rideDetails.rideId,
          rider_id: user?.id || '',
          driver_id: rideDetails.assignedDriver?.id || '',
          pickup_location: {
            latitude: rideDetails.pickupLocation.lat,
            longitude: rideDetails.pickupLocation.lng,
            address: rideDetails.pickupAddress
          },
          destination_location: {
            latitude: rideDetails.destinationLocation.lat,
            longitude: rideDetails.destinationLocation.lng,
            address: rideDetails.destinationAddress
          },
          status: rideStatus,
          fare: rideDetails.fare,
          distance: 0, // Will be calculated
          estimated_duration: 0, // Will be calculated
          ride_type: rideDetails.rideType as 'economy' | 'comfort' | 'premium' | 'xl',
          payment_method: 'cash' as const,
          created_at: new Date().toISOString()
        }}
        otp={rideOTP}
        estimatedArrival={estimatedArrival}
        estimatedDestinationArrival={destinationETA}
        isRideStarted={rideStatus === 'in_progress'}
        onCall={() => {
          console.log('📞 User initiated call to driver');
          // Call functionality handled by the card component
        }}
        onMessage={() => {
          console.log('💬 User initiated message to driver');
          // Message functionality handled by the card component
        }}
        onCancel={() => {
          console.log('❌ User cancelled ride from accepted card');
          setShowRideAcceptedCard(false);
          handleCancelRide();
        }}
        onClose={() => {
          console.log('🔻 User closed ride accepted card');
          setShowRideAcceptedCard(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideInfo: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rideType: {
    fontSize: 12,
    color: '#666',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  plateNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeInfo: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginLeft: 5,
    marginBottom: 8,
  },
  startRideButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startRideButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  otpInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  otpActions: {
    flexDirection: 'row',
    gap: 12,
  },
  otpCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  otpCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  otpConfirmButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  otpConfirmText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default RideTrackingScreen;