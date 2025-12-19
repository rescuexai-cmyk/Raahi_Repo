import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomMapView from '../../components/MapView';
import RideBookingCard from '../../components/RideBookingCard';
import { googleMapsService, LocationCoordinate, FareEstimate } from '../../services/mapsService';
import { driverService, Driver } from '../../services/driverService.mobile';
import { dataSeeder } from '../../services/dataSeeder';
import { rideRequestService } from '../../services/rideRequestService';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import RideInProgressSnackBar from '../../components/RideInProgressSnackBar';
import * as Location from 'expo-location';

interface HomeScreenProps {
  navigation?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { activeRide } = useRide();
  
  // State for locations
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationCoordinate | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationCoordinate | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');

  // State for drivers and ride
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [showBookingCard, setShowBookingCard] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    initializeDriverService();
  }, []);

  // Load nearby drivers when location changes
  useEffect(() => {
    if (currentLocation) {
      loadNearbyDrivers(currentLocation);
    }
  }, [currentLocation]);

  // Set up periodic driver refresh every 30 seconds (Step 6: Auto-refresh)
  useEffect(() => {
    if (!currentLocation) return;

    console.log('⏰ Setting up auto-refresh every 30 seconds...');
    const refreshInterval = setInterval(() => {
      if (currentLocation && !isLoadingDrivers) {
        console.log('🔄 Auto-refresh: Updating driver positions...');
        loadNearbyDrivers(currentLocation);
      }
    }, 30000); // 30 seconds

    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [currentLocation, isLoadingDrivers]);

  /**
   * Initialize driver service and database tables
   */
  const initializeDriverService = async () => {
    try {
      // Initialize database with real data if needed
      if (currentLocation && user) {
        await dataSeeder.initializeIfNeeded(currentLocation, user.id);
      }
      
      console.log('✅ Driver service and real data initialized');
    } catch (error) {
      console.error('❌ Error initializing driver service:', error);
    }
  };

  /**
   * Load nearby drivers from the real driver service
   * Following the flow: Get location → Query PostGIS → Fetch details → Calculate ETAs → Display
   */
  const loadNearbyDrivers = async (location: LocationCoordinate) => {
    try {
      setIsLoadingDrivers(true);
      console.log('🔍 Step 1: Starting driver search near', location.lat, location.lng);

      // Step 1: Query PostGIS for nearby drivers within 10km radius
      console.log('🗄️ Step 2: Querying PostGIS for nearby drivers...');
      const drivers = await driverService.getNearbyDrivers(location, 10000);
      
      if (drivers.length > 0) {
        console.log(`📊 Step 3: Found ${drivers.length} drivers, fetching detailed info...`);
        
        // Step 4: Calculate ETAs are already done in the service
        // Step 5: Update state to display on map
        setNearbyDrivers(drivers);
        
        console.log('✅ Step 4: Driver data loaded and displayed:', {
          total: drivers.length,
          available: drivers.filter((d: Driver) => d.status === 'available').length,
          averageETA: Math.round(drivers.reduce((sum: number, d: Driver) => sum + 0, 0) / drivers.length),
          vehicleTypes: [...new Set(drivers.map((d: Driver) => d.vehicle_info?.type).filter(Boolean))]
        });
      } else {
        console.log('⚠️ No drivers found in the area');
        setNearbyDrivers([]);
      }
      
    } catch (error) {
      console.error('❌ Error in driver loading flow:', error);
      Alert.alert(
        'Driver Loading Error',
        'Unable to load nearby drivers. Please check your connection and try again.',
        [
          { text: 'Cancel' },
          { text: 'Retry', onPress: () => loadNearbyDrivers(location) }
        ]
      );
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  /**
   * Refresh drivers periodically
   */
  const refreshDrivers = async () => {
    if (currentLocation) {
      await loadNearbyDrivers(currentLocation);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('📍 Step 1: Getting current location...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Permission Required',
          'Please enable location permissions to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
          ]
        );
        return;
      }

      console.log('✅ Location permission granted, fetching coordinates...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      console.log('📍 Location obtained:', newLocation);
      setCurrentLocation(newLocation);
      
      // Get address for current location
      console.log('🗺️ Reverse geocoding location...');
      const address = await googleMapsService.reverseGeocode(
        newLocation.lat, 
        newLocation.lng
      );
      
      if (address) {
        console.log('📍 Address resolved:', address.formattedAddress);
        setPickupLocation(newLocation);
        setPickupAddress(address.formattedAddress);
      }
      
      // Trigger the driver loading flow
      console.log('🚗 Initiating driver search flow...');
      await loadNearbyDrivers(newLocation);
      
    } catch (error) {
      console.error('❌ Error in location flow:', error);
      Alert.alert(
        'Error',
        'Unable to get your current location. Please check your location settings.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: getCurrentLocation },
        ]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleShowBookingCard = () => {
    setShowBookingCard(true);
  };

  const handleCloseBookingCard = () => {
    setShowBookingCard(false);
  };

  const handlePickupSelect = async (location: LocationCoordinate, address: string) => {
    setPickupLocation(location);
    
    // Get formatted address
    try {
      const addressData = await googleMapsService.reverseGeocode(location.lat, location.lng);
      setPickupAddress(addressData?.formattedAddress || address);
    } catch (error) {
      setPickupAddress(address);
    }
  };

  const handleDestinationSelect = async (location: LocationCoordinate, address: string) => {
    setDestinationLocation(location);
    
    // Get formatted address
    try {
      const addressData = await googleMapsService.reverseGeocode(location.lat, location.lng);
      setDestinationAddress(addressData?.formattedAddress || address);
    } catch (error) {
      setDestinationAddress(address);
    }
  };

  const handleRideBooking = async (rideType: string, fareEstimate: FareEstimate) => {
    if (!user?.id || !pickupLocation || !destinationLocation || !pickupAddress || !destinationAddress) {
      Alert.alert('Error', 'Please ensure pickup and destination are selected.');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      '🚗 Confirm Your Ride',
      `📍 Pickup: ${pickupAddress}\n📍 Destination: ${destinationAddress}\n\n🚙 Vehicle: ${rideType}\n💰 Fare: ₹${Math.round(fareEstimate.total)}\n📏 Distance: ${fareEstimate.distance}km\n⏱️ Duration: ${Math.round((fareEstimate.estimatedTime || 0) / 60)} min`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🚗 Book Now',
          style: 'default',
          onPress: () => processRideBooking(rideType, fareEstimate),
        },
      ]
    );
  };

  const processRideBooking = async (
    rideType: string, 
    fareEstimate: FareEstimate
  ) => {
    try {
      console.log('🚗 Starting smart ride request process...');
      
      if (!user?.id || !pickupLocation || !destinationLocation || !pickupAddress || !destinationAddress) {
        Alert.alert('Error', 'Missing required information for booking.');
        return;
      }

      // Show searching state
      Alert.alert('🔍 Searching for Drivers', 'Finding the best driver for you...');

      // Initiate the smart ride request process
      const requestResult = await rideRequestService.initiateRideRequest(
        user.id,
        pickupLocation,
        destinationLocation,
        pickupAddress,
        destinationAddress,
        rideType,
        Math.round(fareEstimate.total),
        fareEstimate.distance || 0,
        Math.round((fareEstimate.estimatedTime || 0) / 60)
      );

      if (!requestResult.success) {
        Alert.alert('😞 No Drivers Available', requestResult.message || 'Please try again later.');
        return;
      }

      console.log(`✅ Ride request initiated: ${requestResult.requestId}`);

      // Show searching progress
      Alert.alert(
        '🔍 Searching for Drivers',
        'We\'re finding the best driver for you. You\'ll be notified once a driver accepts your request.',
        [
          { 
            text: 'Cancel', 
            style: 'destructive',
            onPress: () => {
              if (requestResult.requestId) {
                rideRequestService.cancelRideRequest(requestResult.requestId, user.id);
              }
            }
          },
          { text: 'Wait', style: 'default' }
        ]
      );

      // Monitor request status (in real app, this would be via WebSocket)
      monitorRideRequestStatus(requestResult.requestId!);

    } catch (error) {
      console.error('❌ Error in ride booking process:', error);
      Alert.alert(
        'Booking Failed',
        'Unable to process your ride request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Monitor ride request status and notify user of updates
   */
  const monitorRideRequestStatus = (requestId: string) => {
    const checkStatus = () => {
      const request = rideRequestService.getRequestStatus(requestId);
      
      if (!request) {
        return; // Request completed or cancelled
      }

      switch (request.status) {
        case 'searching':
          console.log(`🔍 Still searching... (attempt ${request.requestAttempts}/${request.maxAttempts})`);
          // Continue monitoring
          setTimeout(checkStatus, 2000);
          break;
          
        case 'driver_assigned':
          console.log(`📱 Request sent to driver ${request.assignedDriverId}`);
          // Continue monitoring
          setTimeout(checkStatus, 2000);
          break;
          
        case 'accepted':
          Alert.alert(
            '🎉 Driver Found!',
            'A driver has accepted your request. You\'ll be redirected to track your ride.',
            [{
              text: 'Track Ride',
              onPress: () => {
                // Navigate to ride tracking
                navigation.navigate('RideTracking', {
                  rideId: requestId, // In real app, this would be the actual ride ID
                  assignedDriver: request.assignedDriverId
                });
              }
            }]
          );
          break;
          
        case 'expired':
          Alert.alert(
            '😞 No Drivers Available',
            'Sorry, no drivers are available currently. Please try again later.',
            [{ text: 'OK' }]
          );
          break;
          
        case 'cancelled':
          console.log('🚫 Ride request was cancelled');
          break;
      }
    };

         // Start monitoring
     setTimeout(checkStatus, 1000);
   };

  /**
   * Navigate to active ride when snack bar is tapped
   */
  const handleNavigateToActiveRide = () => {
    if (activeRide) {
      console.log('🚗 Navigating to active ride:', activeRide.rideId);
      
      // Navigate to ride tracking screen with active ride data
      navigation.navigate('RideTracking', {
        rideDetails: {
          rideId: activeRide.rideId,
          rideType: 'economy', // Default or get from activeRide if available
          pickupLocation: { lat: 0, lng: 0 }, // These would be from activeRide
          destinationLocation: { lat: 0, lng: 0 }, // These would be from activeRide  
          pickupAddress: activeRide.pickupAddress,
          destinationAddress: activeRide.destinationAddress,
          assignedDriver: {
            id: 'active-driver',
            name: activeRide.driverName,
            vehicle: {
              plateNumber: activeRide.vehicleInfo
            }
          },
          fare: 0 // This would be calculated
        }
      });
    }
  };

  const handleDriverPress = (driver: Driver) => {
    const vehicleInfo = driver.vehicle_info 
      ? `${driver.vehicle_info.type} • ${driver.vehicle_info.color}\n${driver.vehicle_info.plateNumber}`
      : 'Vehicle info not available';
    
    const additionalInfo = [
      `Rating: ${driver.rating?.toFixed(1) || 'N/A'}⭐`,
      `Total Rides: ${driver.total_rides || 0}`,
      driver.is_verified ? '✅ Verified Driver' : '⚠️ Unverified',
      `Status: ${driver.status}`,
    ].join('\n');

    Alert.alert(
      `${driver.name}${driver.is_verified ? ' ✅' : ''}`,
      `${vehicleInfo}\n\n${additionalInfo}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Profile', 
          onPress: () => console.log('View driver profile:', driver.id) 
        },
        { 
          text: 'Select Driver', 
          style: 'default',
          onPress: () => handleSelectDriver(driver)
        },
      ]
    );
  };

  const handleSelectDriver = async (driver: Driver) => {
    try {
      console.log('🚗 Driver selected:', driver.name, driver.id);
      
      // You could navigate to a driver details screen or start booking process
      Alert.alert(
        'Driver Selected',
        `You selected ${driver.name}. This would typically start the booking process.`,
        [{ text: 'OK' }]
      );
      
      // Example: Update driver status to busy (in a real app)
      // await driverService.updateDriverStatus(driver.id, 'busy');
      
    } catch (error) {
      console.error('Error selecting driver:', error);
      Alert.alert('Error', 'Unable to select driver. Please try again.');
    }
  };

  const handleMapPress = (coordinate: any) => {
    // Option to set pickup/destination by tapping on map
    if (!pickupLocation) {
      handlePickupSelect(coordinate, 'Selected location');
    } else if (!destinationLocation) {
      handleDestinationSelect(coordinate, 'Selected location');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Map View */}
      <CustomMapView
        drivers={nearbyDrivers}
        pickupLocation={pickupLocation || undefined}
        dropoffLocation={destinationLocation || undefined}
        currentUserLocation={currentLocation || undefined}
        userType="rider"
        showUserLocation={true}
        followUserLocation={false}
        showTraffic={true}
        searchRadius={5000}
        onDriverPress={handleDriverPress}
        onLocationPress={handleMapPress}
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Button */}
      {!showBookingCard && (
        <View style={styles.searchButtonContainer}>
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleShowBookingCard}
            disabled={isLoadingLocation}
          >
            <Ionicons name="search" size={20} color="#666" />
            <Text style={styles.searchButtonText}>
              {isLoadingLocation 
                ? 'Getting location...' 
                : isLoadingDrivers 
                ? 'Loading drivers...' 
                : 'Where to?'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Location & Refresh Buttons */}
      <View style={styles.locationButtonContainer}>
        <TouchableOpacity 
          style={[styles.locationButton, styles.refreshButton]} 
          onPress={refreshDrivers}
          disabled={isLoadingDrivers}
        >
          <Ionicons 
            name={isLoadingDrivers ? "refresh" : "car"} 
            size={20} 
            color={isLoadingDrivers ? "#999" : "#007AFF"} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color={isLoadingLocation ? "#999" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Ride Booking Card */}
      <RideBookingCard
        isVisible={showBookingCard}
        onClose={handleCloseBookingCard}
        onPickupSelect={handlePickupSelect}
        onDestinationSelect={handleDestinationSelect}
        onRideBooking={handleRideBooking}
        pickupLocation={pickupLocation || undefined}
        destinationLocation={destinationLocation || undefined}
        pickupAddress={pickupAddress}
        destinationAddress={destinationAddress}
        currentLocation={currentLocation || undefined}
        availableDrivers={nearbyDrivers}
        isLoadingDrivers={isLoadingDrivers}
      />

      {/* Ride In Progress Snack Bar */}
      <RideInProgressSnackBar
        onPress={handleNavigateToActiveRide}
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
  menuButton: {
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
  profileButton: {
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
  searchButtonContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  locationButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 100,
    flexDirection: 'column',
    gap: 12,
  },
  locationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default HomeScreen;