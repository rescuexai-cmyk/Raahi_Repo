import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { rideHistoryService, RideHistoryItem } from '../../services/rideHistoryService';

const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    initializeAndLoadData();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRideHistory();
    }
  }, [filter, user]);

  const initializeAndLoadData = async () => {
    try {
      // Initialize ride history tables
      await rideHistoryService.initializeTables();
      
      if (user) {
        loadRideHistory();
      }
    } catch (error) {
      console.error('❌ Error initializing ride history:', error);
    }
  };

  const loadRideHistory = async () => {
    if (!user) {
      console.log('⚠️ No user found, cannot load ride history');
      return;
    }

    try {
      console.log(`🔍 Loading ride history for user ${user.id} with filter: ${filter}`);
      const rideHistory = await rideHistoryService.getUserRideHistory(user.id, filter);
      setRides(rideHistory);
      
      if (rideHistory.length === 0) {
        console.log('📝 No ride history found - user may need to take some rides first');
      }
    } catch (error) {
      console.error('❌ Error loading ride history:', error);
      setRides([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRideHistory();
    setRefreshing(false);
  };

  const filteredRides = rides.filter(ride => {
    if (filter === 'all') return true;
    return ride.status === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={14}
        color={index < rating ? '#FFD700' : '#E0E0E0'}
      />
    ));
  };

  const getRideTypeIcon = (rideType: string) => {
    switch (rideType.toLowerCase()) {
      case 'economy':
        return 'car';
      case 'comfort':
        return 'car-sport';
      case 'premium':
        return 'car';
      case 'xl':
        return 'car';
      default:
        return 'car';
    }
  };

  const FilterButton = ({ filterType, title }: { filterType: typeof filter, title: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride History</Text>
        <Text style={styles.subtitle}>{filteredRides.length} rides</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton filterType="all" title="All" />
          <FilterButton filterType="completed" title="Completed" />
          <FilterButton filterType="cancelled" title="Cancelled" />
        </ScrollView>
      </View>

      {/* Ride List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRides.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>No rides found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {filter === 'all' 
                ? "You haven't taken any rides yet" 
                : `No ${filter} rides found`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.ridesList}>
            {filteredRides.map((ride) => (
              <TouchableOpacity key={ride.id} style={styles.rideCard}>
                <View style={styles.rideCardHeader}>
                  <View style={styles.rideTypeContainer}>
                    <Ionicons
                      name={getRideTypeIcon(ride.rideType) as any}
                      size={20}
                      color="#007AFF"
                    />
                    <Text style={styles.rideType}>{ride.rideType}</Text>
                  </View>
                  <View style={styles.rideStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: ride.status === 'completed' ? '#4CAF50' : '#FF5722' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: ride.status === 'completed' ? '#4CAF50' : '#FF5722' },
                      ]}
                    >
                      {ride.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.routeItem}>
                    <View style={styles.routeDot} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {ride.from}
                    </Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeItem}>
                    <View style={[styles.routeDot, styles.routeDotDestination]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {ride.to}
                    </Text>
                  </View>
                </View>

                <View style={styles.rideDetails}>
                  <View style={styles.rideDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#666666" />
                    <Text style={styles.rideDetailText}>{formatDate(ride.date)}</Text>
                  </View>
                  <View style={styles.rideDetailItem}>
                    <Ionicons name="map-outline" size={16} color="#666666" />
                    <Text style={styles.rideDetailText}>{ride.distance}</Text>
                  </View>
                  <View style={styles.rideDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#666666" />
                    <Text style={styles.rideDetailText}>{ride.duration}</Text>
                  </View>
                </View>

                <View style={styles.rideFooter}>
                  <View style={styles.fareContainer}>
                    <Text style={styles.fareAmount}>${ride.fare.toFixed(2)}</Text>
                  </View>
                  {ride.rating && (
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(ride.rating)}
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
      filterButtonActive: {
      backgroundColor: '#22C55E',
      borderColor: '#22C55E',
    },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  ridesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideType: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  rideStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  routeDotDestination: {
    backgroundColor: '#FF5722',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rideDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideDetailText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666666',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareContainer: {
    flex: 1,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default HistoryScreen;