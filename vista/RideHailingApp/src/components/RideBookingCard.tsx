import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import AddressSearchInput from './AddressSearchInput';
import { googleMapsService, LocationCoordinate, FareEstimate } from '../services/mapsService';
import { driverService, Driver } from '../services/driverService.mobile';

const { height: screenHeight } = Dimensions.get('window');

interface RideType {
  id: string;
  name: string;
  icon: string;
  description: string;
  capacity: number;
  priceMultiplier: number;
  eta: number;
  available: boolean;
  availableDrivers: number;
  closestDriver?: Driver;
  averageRating?: number;
  isFastest?: boolean;
}

interface RideBookingCardProps {
  isVisible: boolean;
  onClose: () => void;
  onPickupSelect: (location: LocationCoordinate, address: string) => void;
  onDestinationSelect: (location: LocationCoordinate, address: string) => void;
  onRideBooking: (rideType: string, fareEstimate: FareEstimate) => void;
  pickupLocation?: LocationCoordinate;
  destinationLocation?: LocationCoordinate;
  pickupAddress?: string;
  destinationAddress?: string;
  currentLocation?: LocationCoordinate;
  availableDrivers?: Driver[];
  isLoadingDrivers?: boolean;
}

const RideBookingCard: React.FC<RideBookingCardProps> = ({
  isVisible,
  onClose,
  onPickupSelect,
  onDestinationSelect,
  onRideBooking,
  pickupLocation,
  destinationLocation,
  pickupAddress = '',
  destinationAddress = '',
  currentLocation,
  availableDrivers = [],
  isLoadingDrivers = false,
}) => {
  const [cardHeight] = useState(new Animated.Value(0));
  const [dragY] = useState(new Animated.Value(0));
  const [fareEstimates, setFareEstimates] = useState<Record<string, FareEstimate>>({});
  const [selectedRideType, setSelectedRideType] = useState<string>('economy');
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState<'pickup' | 'destination' | 'booking'>('pickup');
  const [rideTypes, setRideTypes] = useState<RideType[]>([]);

  useEffect(() => {
    if (isVisible) {
      showCard();
    } else {
      hideCard();
    }
  }, [isVisible]);

  useEffect(() => {
    if (pickupLocation && destinationLocation) {
      calculateFareEstimates();
      setSearchStep('booking');
    } else if (pickupLocation && !destinationLocation) {
      setSearchStep('destination');
    } else {
      setSearchStep('pickup');
    }
  }, [pickupLocation, destinationLocation]);

  // Generate ride types based on available drivers
  useEffect(() => {
    generateRideTypesFromDrivers();
  }, [availableDrivers, currentLocation]);

  const generateRideTypesFromDrivers = () => {
    console.log('🚗 Generating ride types from available drivers:', availableDrivers.length);

    // Group drivers by vehicle type/ride category
    const driversByRideType = availableDrivers.reduce((acc, driver) => {
      const rideTypes = ['economy']; // Simplified for mobile
      rideTypes.forEach(rideType => {
        if (!acc[rideType]) {
          acc[rideType] = [];
        }
        acc[rideType].push(driver);
      });
      return acc;
    }, {} as Record<string, Driver[]>);

    // Define base ride type configurations
    const baseRideTypes = [
      {
        id: 'bike',
        name: 'RideBike',
        icon: 'bicycle',
        description: 'Quick and affordable bike rides',
        capacity: 1,
        priceMultiplier: 0.6,
        vehicleTypes: ['Bike']
      },
      {
        id: 'economy',
        name: 'RideGo',
        icon: 'car',
        description: 'Affordable everyday rides',
        capacity: 4,
        priceMultiplier: 1.0,
        vehicleTypes: ['Sedan', 'Hatchback']
      },
      {
        id: 'comfort',
        name: 'RideComfort',
        icon: 'car-sport',
        description: 'Newer cars with extra legroom',
        capacity: 4,
        priceMultiplier: 1.3,
        vehicleTypes: ['Sedan', 'Premium']
      },
      {
        id: 'premium',
        name: 'RidePremium',
        icon: 'diamond',
        description: 'High-end cars and top drivers',
        capacity: 4,
        priceMultiplier: 1.8,
        vehicleTypes: ['Premium', 'SUV']
      },
      {
        id: 'xl',
        name: 'RideXL',
        icon: 'bus',
        description: 'Larger vehicles for groups',
        capacity: 6,
        priceMultiplier: 1.5,
        vehicleTypes: ['SUV']
      },
    ];

    // Generate ride types with real driver data
    const generatedRideTypes: RideType[] = baseRideTypes.map(baseType => {
      const driversForType = driversByRideType[baseType.id] || [];
      
      // Also include drivers whose vehicle type matches
      const vehicleMatchDrivers = availableDrivers.filter(driver => 
        driver.vehicle_info && baseType.vehicleTypes.includes(driver.vehicle_info.type)
      );

      const allDriversForType = [...driversForType, ...vehicleMatchDrivers]
        .filter((driver, index, self) => self.findIndex(d => d.id === driver.id) === index); // Remove duplicates

      // Find closest driver
      const closestDriver = allDriversForType.reduce((closest, driver) => {
        if (!closest) return driver;
        return driver; // Simplified for mobile
      }, null as Driver | null);

      // Calculate average rating
      const ratingsSum = allDriversForType.reduce((sum, driver) => sum + (driver.rating || 4.0), 0);
      const averageRating = allDriversForType.length > 0 ? ratingsSum / allDriversForType.length : 4.0;

      return {
        ...baseType,
        eta: 5, // Default ETA for mobile
        available: allDriversForType.length > 0,
        availableDrivers: allDriversForType.length,
        closestDriver: closestDriver || undefined,
        averageRating,
      };
    });

    // Sort by availability and ETA
    generatedRideTypes.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.eta - b.eta;
    });

    // Mark the fastest available ride type
    const availableTypes = generatedRideTypes.filter(rt => rt.available);
    if (availableTypes.length > 0) {
      const fastestETA = Math.min(...availableTypes.map(rt => rt.eta));
      generatedRideTypes.forEach(rideType => {
        (rideType as any).isFastest = rideType.available && rideType.eta === fastestETA;
      });
    }

    console.log('✅ Generated ride types:', generatedRideTypes.map(rt => ({
      id: rt.id,
      available: rt.available,
      eta: rt.eta,
      drivers: rt.availableDrivers,
      isFastest: (rt as any).isFastest
    })));

    setRideTypes(generatedRideTypes);

    // Auto-select first available ride type
    const firstAvailable = generatedRideTypes.find(rt => rt.available);
    if (firstAvailable && selectedRideType !== firstAvailable.id) {
      setSelectedRideType(firstAvailable.id);
    }
  };

  const showCard = () => {
    Animated.spring(cardHeight, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const hideCard = () => {
    Animated.spring(cardHeight, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  const calculateFareEstimates = async () => {
    if (!pickupLocation || !destinationLocation) return;

    setLoading(true);
    try {
      const directions = await googleMapsService.getDirections(pickupLocation, destinationLocation);
      
      if (directions) {
        const estimates: Record<string, FareEstimate> = {};
        
        rideTypes.forEach(rideType => {
          const baseEstimate = googleMapsService.calculateFareEstimate(
            directions.distance.value,
            directions.duration.value,
            rideType.id
          );
          
          estimates[rideType.id] = {
            ...baseEstimate,
            total: baseEstimate.total * rideType.priceMultiplier,
            subtotal: baseEstimate.subtotal * rideType.priceMultiplier,
          };
        });
        
        setFareEstimates(estimates);
      }
    } catch (error) {
      console.error('Error calculating fare estimates:', error);
      Alert.alert('Error', 'Unable to calculate fare estimates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickupSelect = (location: LocationCoordinate, address: string) => {
    onPickupSelect(location, address);
  };

  const handleDestinationSelect = (location: LocationCoordinate, address: string) => {
    onDestinationSelect(location, address);
  };

  const handleRideTypeSelect = (rideTypeId: string) => {
    setSelectedRideType(rideTypeId);
  };

  const handleBookRide = () => {
    const selectedFare = fareEstimates[selectedRideType];
    if (selectedFare) {
      onRideBooking(selectedRideType, selectedFare);
    }
  };

  const formatPrice = (price: number): string => {
    return `₹${Math.round(price)}`;
  };

  const formatETA = (minutes: number): string => {
    return `${minutes} min`;
  };

  const cardTranslateY = cardHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const renderSearchStep = () => {
    switch (searchStep) {
      case 'pickup':
        return (
          <View style={styles.searchContainer}>
            <Text style={styles.stepTitle}>Where are you?</Text>
            <AddressSearchInput
              placeholder="Enter pickup location"
              onLocationSelect={(location) => {
                const address = 'Selected pickup location';
                handlePickupSelect(location, address);
              }}
              currentLocation={currentLocation}
              showCurrentLocationButton={true}
              autoFocus={true}
            />
          </View>
        );

      case 'destination':
        return (
          <View style={styles.searchContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText} numberOfLines={1}>
                {pickupAddress || 'Pickup location'}
              </Text>
            </View>
            
            <View style={styles.locationConnector} />
            
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <View style={styles.destinationInput}>
                <AddressSearchInput
                  placeholder="Where to?"
                  onLocationSelect={(location) => {
                    const address = 'Selected destination';
                    handleDestinationSelect(location, address);
                  }}
                  currentLocation={pickupLocation}
                  autoFocus={true}
                />
              </View>
            </View>
          </View>
        );

      case 'booking':
        return (
          <View style={styles.bookingContainer}>
            {renderFareEstimates()}
          </View>
        );

      default:
        return null;
    }
  };

  const renderFareEstimates = () => (
    <ScrollView style={styles.fareContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Choose a ride</Text>
        {isLoadingDrivers && (
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={16} color="#007AFF" />
            <Text style={styles.loadingText}>Updating...</Text>
          </View>
        )}
      </View>
      
      {rideTypes.length === 0 && !isLoadingDrivers ? (
        <View style={styles.noDriversContainer}>
          <Ionicons name="car" size={48} color="#DDD" />
          <Text style={styles.noDriversText}>No drivers available</Text>
          <Text style={styles.noDriversSubtext}>Please try again in a few minutes</Text>
        </View>
      ) : (
        rideTypes.map((rideType) => {
          const fareEstimate = fareEstimates[rideType.id];
          const isSelected = selectedRideType === rideType.id;
          
          return (
            <TouchableOpacity
              key={rideType.id}
              style={[
                styles.rideTypeCard,
                isSelected && styles.rideTypeCardSelected,
                !rideType.available && styles.rideTypeCardDisabled,
              ]}
              onPress={() => rideType.available && handleRideTypeSelect(rideType.id)}
              disabled={!rideType.available}
            >
              <View style={styles.rideTypeIcon}>
                <Ionicons 
                  name={rideType.icon as any} 
                  size={28} 
                  color={isSelected ? '#007AFF' : '#666'} 
                />
                {rideType.available && rideType.availableDrivers > 0 && (
                  <View style={styles.driverCountBadge}>
                    <Text style={styles.driverCountText}>{rideType.availableDrivers}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.rideTypeInfo}>
                <View style={styles.rideTypeHeader}>
                  <View style={styles.nameAndTag}>
                    <Text style={[styles.rideTypeName, isSelected && styles.selectedText]}>
                      {rideType.name}
                    </Text>
                    {rideType.isFastest && (
                      <View style={styles.fastestTag}>
                        <Text style={styles.fastestTagText}>FASTEST</Text>
                      </View>
                    )}
                  </View>
                  {rideType.averageRating && rideType.averageRating > 0 && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.ratingText}>{rideType.averageRating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.rideTypeDescription}>
                  {rideType.description}
                </Text>
                
                <View style={styles.rideTypeDetails}>
                  <Text style={styles.rideTypeCapacity}>
                    {rideType.capacity} seats
                  </Text>
                  {rideType.available && rideType.eta > 0 && (
                    <>
                      <Text style={styles.detailSeparator}>•</Text>
                      <Text style={styles.etaText}>{formatETA(rideType.eta)} away</Text>
                    </>
                  )}
                  {rideType.closestDriver && rideType.closestDriver.vehicle_info && (
                    <>
                      <Text style={styles.detailSeparator}>•</Text>
                      <Text style={styles.vehicleInfo}>
                        {rideType.closestDriver.vehicle_info.color} {rideType.closestDriver.vehicle_info.type}
                      </Text>
                    </>
                  )}
                </View>
                
                {rideType.closestDriver && (
                  <Text style={styles.driverInfo}>
                    Closest: {rideType.closestDriver.name}
                    {rideType.closestDriver.is_verified && ' ✅'}
                  </Text>
                )}
              </View>
              
              <View style={styles.rideTypePrice}>
                {loading ? (
                  <Text style={styles.priceLoading}>Calculating...</Text>
                ) : fareEstimate ? (
                  <Text style={[styles.price, isSelected && styles.selectedText]}>
                    {formatPrice(fareEstimate.total)}
                  </Text>
                ) : (
                  <Text style={styles.priceUnavailable}>N/A</Text>
                )}
                {!rideType.available ? (
                  <Text style={styles.unavailableText}>No drivers</Text>
                ) : rideType.availableDrivers > 0 && (
                  <Text style={styles.availableText}>
                    {rideType.availableDrivers} available
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
      
      {searchStep === 'booking' && fareEstimates[selectedRideType] && (
        <View style={styles.bookingActions}>
          <View style={styles.fareBreakdown}>
            <Text style={styles.fareBreakdownTitle}>Fare Breakdown</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Base fare</Text>
              <Text style={styles.fareValue}>
                {formatPrice(fareEstimates[selectedRideType].baseFare)}
              </Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance</Text>
              <Text style={styles.fareValue}>
                {formatPrice(fareEstimates[selectedRideType].distanceFare)}
              </Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Time</Text>
              <Text style={styles.fareValue}>
                {formatPrice(fareEstimates[selectedRideType].timeFare)}
              </Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Taxes</Text>
              <Text style={styles.fareValue}>
                {formatPrice(fareEstimates[selectedRideType].taxes)}
              </Text>
            </View>
            <View style={[styles.fareRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(fareEstimates[selectedRideType].total)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.bookButton} onPress={handleBookRide}>
            <Text style={styles.bookButtonText}>
              Book {rideTypes.find(rt => rt.id === selectedRideType)?.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: cardTranslateY }],
        },
      ]}
    >
      <View style={styles.handle} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={hideCard}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        
        {searchStep === 'booking' && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSearchStep('destination')}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.headerTitle}>Book a Ride</Text>
      </View>
      
      {renderSearchStep()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: screenHeight * 0.8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  searchContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 16,
  },
  destinationDot: {
    backgroundColor: '#F44336',
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  locationConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginLeft: 5,
    marginBottom: 8,
  },
  destinationInput: {
    flex: 1,
  },
  bookingContainer: {
    flex: 1,
  },
  fareContainer: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#007AFF',
  },
  noDriversContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDriversText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noDriversSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  rideTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  rideTypeCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  rideTypeCardDisabled: {
    opacity: 0.5,
  },
  rideTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  driverCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  driverCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  rideTypeInfo: {
    flex: 1,
  },
  rideTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameAndTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fastestTag: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fastestTagText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  rideTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rideTypeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rideTypeCapacity: {
    fontSize: 12,
    color: '#999',
  },
  detailSeparator: {
    fontSize: 12,
    color: '#DDD',
    marginHorizontal: 6,
  },
  etaText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#666',
  },
  driverInfo: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  rideTypePrice: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceLoading: {
    fontSize: 14,
    color: '#999',
  },
  priceUnavailable: {
    fontSize: 14,
    color: '#999',
  },
  unavailableText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2,
  },
  availableText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  selectedText: {
    color: '#007AFF',
  },
  bookingActions: {
    marginTop: 20,
  },
  fareBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fareBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideBookingCard;