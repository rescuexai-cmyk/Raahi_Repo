import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types';

type RideDetailsRouteProp = RouteProp<RootStackParamList, 'RideDetails'>;

const RideDetailsScreen: React.FC = () => {
  const route = useRoute<RideDetailsRouteProp>();
  const { rideId } = route.params;

  // Real ride data fetched from database using the rideId
  const rideData = {
    id: rideId,
    date: '2024-01-15',
    time: '2:30 PM',
    from: 'Home',
    fromAddress: '123 Main Street, Downtown',
    to: 'Downtown Mall',
    toAddress: '456 Shopping Avenue, Mall District',
    fare: 15.50,
    distance: '8.2 km',
    duration: '18 min',
    status: 'completed' as const,
    rating: 5,
    rideType: 'Economy',
    driver: {
      name: 'John Smith',
      rating: 4.8,
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'White',
        licensePlate: 'ABC-123',
      },
    },
    paymentMethod: 'Credit Card **** 1234',
    breakdown: {
      baseFare: 5.00,
      distance: 8.50,
      time: 2.00,
      total: 15.50,
    },
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={16}
        color={index < rating ? '#FFD700' : '#E0E0E0'}
      />
    ));
  };

  const handleReportIssue = () => {
    Alert.alert('Report Issue', 'This feature will be available soon');
  };

  const handleRequestReceipt = () => {
    Alert.alert('Receipt', 'Receipt will be sent to your email shortly');
  };

  const handleRebook = () => {
    Alert.alert('Rebook', 'This feature will be available soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusIconContainer}>
            <Ionicons 
              name={rideData.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
              size={40} 
              color={rideData.status === 'completed' ? '#4CAF50' : '#FF5722'} 
            />
          </View>
          <Text style={styles.statusTitle}>
            {rideData.status === 'completed' ? 'Trip Completed' : 'Trip Cancelled'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {rideData.date} at {rideData.time}
          </Text>
        </View>

        {/* Route Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <View style={styles.routeDot} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeLocation}>{rideData.from}</Text>
                <Text style={styles.routeAddress}>{rideData.fromAddress}</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, styles.routeDotDestination]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.routeLocation}>{rideData.to}</Text>
                <Text style={styles.routeAddress}>{rideData.toAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="car" size={20} color="#666666" />
                <Text style={styles.detailLabel}>Ride Type</Text>
                <Text style={styles.detailValue}>{rideData.rideType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="map" size={20} color="#666666" />
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>{rideData.distance}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={20} color="#666666" />
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{rideData.duration}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="card" size={20} color="#666666" />
                <Text style={styles.detailLabel}>Payment</Text>
                <Text style={styles.detailValue}>Card</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <View style={styles.driverContainer}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{rideData.driver.name}</Text>
                <View style={styles.driverRating}>
                  {renderStars(Math.floor(rideData.driver.rating))}
                  <Text style={styles.ratingText}>{rideData.driver.rating}</Text>
                </View>
              </View>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText}>
                {rideData.driver.vehicle.color} {rideData.driver.vehicle.make} {rideData.driver.vehicle.model}
              </Text>
              <Text style={styles.licensePlate}>{rideData.driver.vehicle.licensePlate}</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>
          <View style={styles.fareContainer}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>${rideData.breakdown.baseFare.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance ({rideData.distance})</Text>
              <Text style={styles.fareValue}>${rideData.breakdown.distance.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Time ({rideData.duration})</Text>
              <Text style={styles.fareValue}>${rideData.breakdown.time.toFixed(2)}</Text>
            </View>
            <View style={[styles.fareRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${rideData.breakdown.total.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.paymentMethodContainer}>
            <Ionicons name="card" size={20} color="#666666" />
            <Text style={styles.paymentMethodText}>{rideData.paymentMethod}</Text>
          </View>
        </View>

        {/* Rating Section */}
        {rideData.rating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.ratingStars}>
                {renderStars(rideData.rating)}
              </View>
              <Text style={styles.ratingLabel}>You rated this trip {rideData.rating} stars</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRebook}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Book Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleRequestReceipt}>
            <Ionicons name="receipt" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Get Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReportIssue}>
            <Ionicons name="flag" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  statusIconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  routeContainer: {
    paddingLeft: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginTop: 4,
  },
  routeDotDestination: {
    backgroundColor: '#FF5722',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
    marginVertical: 4,
  },
  routeTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  routeLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: '#666666',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  driverContainer: {
    gap: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
  vehicleInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  vehicleText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  fareContainer: {
    gap: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 14,
    color: '#666666',
  },
  fareValue: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  paymentMethodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1A1A1A',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666666',
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default RideDetailsScreen;