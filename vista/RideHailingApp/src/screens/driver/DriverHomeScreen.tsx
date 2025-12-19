import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import CustomMapView from '../../components/MapView';
import * as Location from 'expo-location';
import { LocationCoordinate } from '../../services/mapsService';
import { driverService } from '../../services/driverService.mobile';
import { rideRequestService } from '../../services/rideRequestService';

const { width } = Dimensions.get('window');

interface RideRequest {
  id: string;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFare: number;
  distance: string;
  riderName: string;
  riderRating: number;
  estimatedDuration: string;
  rideType: string;
}

interface DriverHomeScreenProps {
  navigation?: any;
}

const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  
  // Driver status and location
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    trips: 0
  });
  
  // Ride requests
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [acceptanceTimer, setAcceptanceTimer] = useState(0);
  
  useEffect(() => {
    getCurrentLocation();
    loadDriverEarnings();
  }, []);

  useEffect(() => {
    if (isOnline && currentLocation && user) {
      updateDriverLocation();
      startListeningForRideRequests();
    } else {
      stopListeningForRideRequests();
    }
  }, [isOnline, currentLocation]);

  /**
   * Get current location for driver
   */
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for driving');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  /**
   * Update driver location in database
   */
  const updateDriverLocation = async () => {
    if (!currentLocation || !user) return;

    try {
      await driverService.updateDriverLocation(
        user.id,
        currentLocation,
        0 // heading
      );
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  /**
   * Load driver earnings data
   */
  const loadDriverEarnings = async () => {
    // This would come from a real earnings service
    setEarnings({
      today: 450,
      week: 2850,
      month: 12500,
      trips: 23
    });
  };

  /**
   * Toggle driver online/offline status
   */
  const toggleOnlineStatus = async (value: boolean) => {
    try {
      if (value && !currentLocation) {
        Alert.alert('Location Required', 'Please enable location to go online');
        return;
      }

      setIsOnline(value);
      
      // Update driver status in database
      if (user) {
        await driverService.updateDriverStatus(user.id, value ? 'available' : 'offline');
      }

      if (value) {
        Alert.alert(
          '🟢 You\'re Online!',
          'You can now receive ride requests. Drive safely!',
          [{ text: 'Got it' }]
        );
      } else {
        Alert.alert(
          '🔴 You\'re Offline',
          'You won\'t receive any ride requests while offline.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      Alert.alert('Error', 'Failed to update your status. Please try again.');
    }
  };

  /**
   * Start listening for ride requests
   */
  const startListeningForRideRequests = () => {
    // Simulate incoming ride request after 10 seconds when online
    setTimeout(() => {
      if (isOnline) {
        simulateIncomingRideRequest();
      }
    }, 10000);
  };

  /**
   * Stop listening for ride requests
   */
  const stopListeningForRideRequests = () => {
    setIncomingRequest(null);
    setAcceptanceTimer(0);
  };

  /**
   * Simulate an incoming ride request (in real app, this would come via WebSocket)
   */
  const simulateIncomingRideRequest = () => {
    const mockRequest: RideRequest = {
      id: 'ride_' + Date.now(),
      pickupAddress: 'MG Road, Bangalore',
      destinationAddress: 'Koramangala, Bangalore',
      estimatedFare: 85,
      distance: '3.2 km',
      riderName: 'Priya Sharma',
      riderRating: 4.8,
      estimatedDuration: '12 min',
      rideType: 'RideGo'
    };

    setIncomingRequest(mockRequest);
    setAcceptanceTimer(15); // 15 seconds to accept

    // Start countdown
    const timer = setInterval(() => {
      setAcceptanceTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIncomingRequest(null);
          Alert.alert('Request Expired', 'You missed the ride request.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Accept the ride request
   */
  const acceptRideRequest = async () => {
    if (!incomingRequest || !user) return;

    try {
      // Handle acceptance through ride request service
      const result = await rideRequestService.handleDriverAcceptance(
        incomingRequest.id, 
        user.id
      );

      if (result.success) {
        Alert.alert(
          '🎉 Ride Accepted!',
          `Navigate to pickup location: ${incomingRequest.pickupAddress}`,
          [
            {
              text: 'Start Navigation',
              onPress: () => {
                setIncomingRequest(null);
                setAcceptanceTimer(0);
                // In real app, navigate to DriverRideScreen
                console.log('Navigate to pickup location');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to accept ride');
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride request');
    }
  };

  /**
   * Decline the ride request
   */
  const declineRideRequest = async () => {
    if (!incomingRequest || !user) return;

    try {
      // Handle decline through ride request service
      await rideRequestService.handleDriverDecline(incomingRequest.id, user.id);
      
      setIncomingRequest(null);
      setAcceptanceTimer(0);
      Alert.alert('Request Declined', 'Looking for more rides...');
    } catch (error) {
      console.error('Error declining ride:', error);
      setIncomingRequest(null);
      setAcceptanceTimer(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => navigation.openDrawer?.()}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Driver Dashboard</Text>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle" size={32} color="#22C55E" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <CustomMapView
          currentUserLocation={currentLocation || undefined}
          drivers={[]} // Don't show other drivers to this driver
          onRegionChange={(region) => {
            setCurrentLocation({
              lat: region.latitude,
              lng: region.longitude
            });
          }}
          showUserLocation={true}
        />
        
        {/* Online/Offline Status Overlay */}
        <View style={styles.statusOverlay}>
          <View style={[styles.statusCard, isOnline ? styles.onlineCard : styles.offlineCard]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
                  {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
                </Text>
                <Text style={styles.statusSubtext}>
                  {isOnline ? 'Ready for rides' : 'Not receiving requests'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#E0E0E0', true: '#22C55E' }}
                thumbColor={isOnline ? '#FFF' : '#FFF'}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Earnings Card */}
      <ScrollView style={styles.bottomSection} showsVerticalScrollIndicator={false}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Today's Earnings</Text>
          <Text style={styles.earningsAmount}>₹{earnings.today}</Text>
          
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>This Week</Text>
              <Text style={styles.earningsValue}>₹{earnings.week}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>This Month</Text>
              <Text style={styles.earningsValue}>₹{earnings.month}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>Trips</Text>
              <Text style={styles.earningsValue}>{earnings.trips}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="car" size={24} color="#22C55E" />
            <Text style={styles.actionText}>My Vehicle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="analytics" size={24} color="#22C55E" />
            <Text style={styles.actionText}>Earnings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="time" size={24} color="#22C55E" />
            <Text style={styles.actionText}>Trip History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle" size={24} color="#22C55E" />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Incoming Ride Request Modal */}
      {incomingRequest && (
        <View style={styles.requestOverlay}>
          <View style={styles.requestModal}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitle}>New Ride Request</Text>
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{acceptanceTimer}s</Text>
              </View>
            </View>
            
            <View style={styles.requestDetails}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#22C55E" />
                <Text style={styles.locationText}>{incomingRequest.pickupAddress}</Text>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.locationRow}>
                <Ionicons name="flag" size={16} color="#F44336" />
                <Text style={styles.locationText}>{incomingRequest.destinationAddress}</Text>
              </View>
            </View>
            
            <View style={styles.rideInfo}>
              <View style={styles.rideInfoRow}>
                <Text style={styles.fareText}>₹{incomingRequest.estimatedFare}</Text>
                <Text style={styles.distanceText}>{incomingRequest.distance}</Text>
                <Text style={styles.durationText}>{incomingRequest.estimatedDuration}</Text>
              </View>
              
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{incomingRequest.riderName}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.ratingText}>{incomingRequest.riderRating}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.requestActions}>
              <TouchableOpacity 
                style={styles.declineButton}
                onPress={declineRideRequest}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={acceptRideRequest}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  offlineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineText: {
    color: '#22C55E',
  },
  offlineText: {
    color: '#F44336',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomSection: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 300,
  },
  earningsCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  earningsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  actionButton: {
    width: (width - 56) / 2,
    aspectRatio: 1.5,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
  // Ride Request Modal Styles
  requestOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  requestModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    width: width - 40,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginLeft: 7,
    marginBottom: 8,
  },
  rideInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    marginBottom: 20,
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fareText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22C55E',
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  riderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default DriverHomeScreen;