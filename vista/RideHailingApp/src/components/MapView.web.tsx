import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LocationCoordinate } from '../services/mapsService';

interface Driver {
  id: string;
  name: string;
  rating: number;
  current_location?: LocationCoordinate;
  vehicle_info?: {
    type: string;
    color: string;
    plateNumber: string;
  };
}

interface MapViewProps {
  drivers?: Driver[];
  pickupLocation?: LocationCoordinate;
  dropoffLocation?: LocationCoordinate;
  currentUserLocation?: LocationCoordinate;
  route?: any;
  userType?: 'rider' | 'driver';
  isTracking?: boolean;
  onLocationPress?: (coordinate: any) => void;
  onDriverPress?: (driver: Driver) => void;
  onRegionChange?: (region: any) => void;
  showUserLocation?: boolean;
}

const { width, height } = Dimensions.get('window');

const MapView: React.FC<MapViewProps> = ({
  drivers = [],
  pickupLocation,
  dropoffLocation,
  currentUserLocation,
  userType = 'rider',
  isTracking = false,
  onLocationPress,
  onDriverPress,
  onRegionChange,
  showUserLocation = true,
}) => {
  const handleMapClick = () => {
    if (onLocationPress) {
      onLocationPress({
        latitude: 37.7749,
        longitude: -122.4194
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} onTouchEnd={handleMapClick}>
        <Text style={styles.mapTitle}>🗺️ Interactive Map</Text>
        <Text style={styles.mapSubtitle}>Web Version</Text>
        
        {/* User Location */}
        {showUserLocation && currentUserLocation && (
          <View style={styles.locationItem}>
            <Text style={styles.locationEmoji}>📍</Text>
            <Text style={styles.locationText}>
              Your Location: {currentUserLocation.lat.toFixed(4)}, {currentUserLocation.lng.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Pickup Location */}
        {pickupLocation && (
          <View style={styles.locationItem}>
            <Text style={styles.locationEmoji}>🔵</Text>
            <Text style={styles.locationText}>
              Pickup: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Dropoff Location */}
        {dropoffLocation && (
          <View style={styles.locationItem}>
            <Text style={styles.locationEmoji}>🔴</Text>
            <Text style={styles.locationText}>
              Destination: {dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Drivers */}
        {drivers.length > 0 && (
          <View style={styles.driversContainer}>
            <Text style={styles.driversTitle}>🚗 Nearby Drivers ({drivers.length})</Text>
            {drivers.slice(0, 3).map((driver, index) => (
              <View 
                key={driver.id} 
                style={styles.driverItem}
                onTouchEnd={() => onDriverPress?.(driver)}
              >
                <Text style={styles.driverEmoji}>🚕</Text>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverDetails}>
                    ⭐ {driver.rating} • {driver.vehicle_info?.type || 'Economy'}
                  </Text>
                  {driver.current_location && (
                    <Text style={styles.driverLocation}>
                      {driver.current_location.lat.toFixed(4)}, {driver.current_location.lng.toFixed(4)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Mode: {userType} {isTracking ? '• Tracking' : ''}
          </Text>
          <Text style={styles.webNote}>
            📱 For full map experience, use mobile app
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f5e8',
    borderRadius: 10,
    margin: 10,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderStyle: 'dashed',
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  locationEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  driversContainer: {
    marginTop: 20,
    width: '100%',
    maxWidth: 300,
  },
  driversTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  driverEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  driverDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  driverLocation: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  statusContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  webNote: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default MapView;