import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Platform, Text } from 'react-native';
import MapView, { 
  Marker, 
  Polyline, 
  PROVIDER_GOOGLE, 
  Region, 
  MapPressEvent,
  LatLng,
  Circle
} from 'react-native-maps';
import * as Location from 'expo-location';
import { googleMapsService, LocationCoordinate } from '../services/mapsService';
import { Driver as MobileDriver } from '../services/driverService.mobile';
import { Ionicons } from '@expo/vector-icons';



interface RouteInfo {
  coordinates: LatLng[];
  distance: string;
  duration: string;
  polyline?: string;
}

interface MapViewProps {
  drivers?: MobileDriver[];
  pickupLocation?: LocationCoordinate;
  dropoffLocation?: LocationCoordinate;
  currentUserLocation?: LocationCoordinate;
  route?: RouteInfo;
  userType?: 'rider' | 'driver';
  isTracking?: boolean;
  onLocationPress?: (coordinate: LatLng) => void;
  onDriverPress?: (driver: MobileDriver) => void;
  onRegionChange?: (region: Region) => void;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  showTraffic?: boolean;
  searchRadius?: number;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  mapStyle?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  rideInProgress?: boolean;
  driverLocation?: LocationCoordinate;
}

const CustomMapView: React.FC<MapViewProps> = ({
  drivers = [],
  pickupLocation,
  dropoffLocation,
  currentUserLocation,
  route,
  userType = 'rider',
  isTracking = false,
  onLocationPress,
  onDriverPress,
  onRegionChange,
  showUserLocation = true,
  followUserLocation = false,
  mapStyle = 'standard',
  showTraffic = true,
  searchRadius = 5000,
  routeCoordinates: propRouteCoordinates,
  rideInProgress = false,
  driverLocation
}) => {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 12.9716, // Default to Bangalore
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<LocationCoordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>(propRouteCoordinates || []);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize user location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Update route when pickup/dropoff changes
  useEffect(() => {
    if (pickupLocation && dropoffLocation && isMapReady) {
      calculateRoute(pickupLocation, dropoffLocation);
    }
  }, [pickupLocation, dropoffLocation, isMapReady]);

  // Follow user location
  useEffect(() => {
    if (followUserLocation && currentUserLocation && isMapReady) {
      animateToLocation(currentUserLocation);
    }
  }, [currentUserLocation, followUserLocation, isMapReady]);

  // Fit map to show all markers
  useEffect(() => {
    if (isMapReady && (drivers.length > 0 || pickupLocation || dropoffLocation)) {
      fitToMarkers();
    }
  }, [drivers, pickupLocation, dropoffLocation, isMapReady]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your location on the map.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setUserLocation(newLocation);
      
      if (isMapReady) {
        animateToLocation(newLocation);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Unable to get your current location. Please check your location settings.');
    }
  };

  const calculateRoute = async (origin: LocationCoordinate, destination: LocationCoordinate) => {
    try {
      const directions = await googleMapsService.getDirections(origin, destination);
      
      if (directions) {
        const coordinates = googleMapsService.decodePolyline(directions.polyline);
        const routeCoords = coordinates.map(coord => ({
          latitude: coord.lat,
          longitude: coord.lng,
        }));
        
        setRouteCoordinates(routeCoords);
        
        // Fit map to show entire route
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(routeCoords, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'Unable to calculate route. Please try again.');
    }
  };

  const animateToLocation = (location: LocationCoordinate, zoom?: number) => {
    if (mapRef.current) {
      const newRegion = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: zoom || 0.01,
        longitudeDelta: zoom || 0.01,
      };
      
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const fitToMarkers = () => {
    if (!mapRef.current) return;

    const coordinates: LatLng[] = [];

    // Add driver locations
    drivers.forEach(driver => {
      if (driver.current_location) {
        coordinates.push({
          latitude: driver.current_location.lat,
          longitude: driver.current_location.lng,
        });
      }
    });

    // Add pickup/dropoff locations
    if (pickupLocation) {
      coordinates.push({
        latitude: pickupLocation.lat,
        longitude: pickupLocation.lng,
      });
    }

    if (dropoffLocation) {
      coordinates.push({
        latitude: dropoffLocation.lat,
        longitude: dropoffLocation.lng,
      });
    }

    // Add user location
    if (userLocation) {
      coordinates.push({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      });
    }

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (onLocationPress) {
      onLocationPress(event.nativeEvent.coordinate);
    }
  };

  const handleDriverPress = (driver: MobileDriver) => {
    if (onDriverPress) {
      onDriverPress(driver);
    }
  };

  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
    if (onRegionChange) {
      onRegionChange(newRegion);
    }
  };

  const getDriverMarkerColor = (driver: MobileDriver): string => {
    if (rideInProgress && driverLocation && driver.current_location &&
        driver.current_location.lat === driverLocation.lat && 
        driver.current_location.lng === driverLocation.lng) {
      return '#00C851'; // Green for assigned driver
    }
    return '#007AFF'; // Blue for available drivers
  };

  const getMarkerRotation = (heading?: number): number => {
    return heading || 0;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapStyle}
        showsUserLocation={showUserLocation}
        followsUserLocation={followUserLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={Platform.OS === 'android'}
        showsBuildings={true}
        showsIndoors={true}

        rotateEnabled={true}
        pitchEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        region={region}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setIsMapReady(true)}
        loadingEnabled={true}
        loadingIndicatorColor="#007AFF"
        loadingBackgroundColor="#F5F5F5"
      >
        {/* User location marker */}
        {userLocation && !showUserLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            }}
            title="Your Location"
            description="Current location"
            pinColor="#FF6B6B"
          >
            <View style={styles.userMarker}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Driver markers */}
        {drivers.filter(driver => driver.current_location).map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{
              latitude: driver.current_location!.lat,
              longitude: driver.current_location!.lng,
            }}
            title={driver.name}
            description={`${driver.vehicle_info?.type || 'Vehicle'} • ${driver.rating || 'N/A'}⭐`}
            onPress={() => handleDriverPress(driver)}
            rotation={0}
            flat={true}
          >
            <View style={[styles.driverMarker, { backgroundColor: '#22C55E' }]}>
              <Ionicons name="car" size={20} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* Pickup location marker */}
        {pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.lat,
              longitude: pickupLocation.lng,
            }}
            title="Pickup Location"
            description="Your pickup point"
            pinColor="#4CAF50"
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="location" size={24} color="#4CAF50" />
            </View>
          </Marker>
        )}

        {/* Dropoff location marker */}
        {dropoffLocation && (
          <Marker
            coordinate={{
              latitude: dropoffLocation.lat,
              longitude: dropoffLocation.lng,
            }}
            title="Dropoff Location"
            description="Your destination"
            pinColor="#F44336"
          >
            <View style={styles.dropoffMarker}>
              <Ionicons name="flag" size={24} color="#F44336" />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#22C55E"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Search radius circle */}
        {userLocation && searchRadius && userType === 'rider' && !rideInProgress && (
          <Circle
            center={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            }}
            radius={searchRadius}
            strokeColor="rgba(0, 122, 255, 0.3)"
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeWidth={1}
          />
        )}

        {/* Driver's current location during ride */}
        {rideInProgress && driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
            }}
            title="Driver Location"
            description="Your driver's current location"
            rotation={0}
            flat={true}
          >
            <View style={styles.activeDriverMarker}>
              <Ionicons name="car-sport" size={24} color="#FFF" />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  activeDriverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C851',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  pickupMarker: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dropoffMarker: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  etaBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  etaText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default CustomMapView;