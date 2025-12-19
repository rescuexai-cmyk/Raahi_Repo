import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ActiveRide {
  rideId: string;
  status: 'requested' | 'accepted' | 'driver_arriving' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
  driverName: string;
  vehicleInfo: string;
  pickupAddress: string;
  destinationAddress: string;
  estimatedArrival?: number;
  startedAt?: string;
}

interface RideContextType {
  activeRide: ActiveRide | null;
  setActiveRide: (ride: ActiveRide | null) => void;
  updateRideStatus: (status: ActiveRide['status']) => void;
  clearActiveRide: () => void;
  isRideActive: boolean;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

interface RideProviderProps {
  children: ReactNode;
}

export const RideProvider: React.FC<RideProviderProps> = ({ children }) => {
  const [activeRide, setActiveRideState] = useState<ActiveRide | null>(null);

  // Persist active ride to AsyncStorage
  const setActiveRide = async (ride: ActiveRide | null) => {
    try {
      setActiveRideState(ride);
      if (ride) {
        await AsyncStorage.setItem('activeRide', JSON.stringify(ride));
        console.log('🚗 Active ride saved:', ride.rideId);
      } else {
        await AsyncStorage.removeItem('activeRide');
        console.log('🚗 Active ride cleared');
      }
    } catch (error) {
      console.error('Error saving active ride:', error);
    }
  };

  // Update ride status
  const updateRideStatus = async (status: ActiveRide['status']) => {
    if (activeRide) {
      const updatedRide = { ...activeRide, status };
      await setActiveRide(updatedRide);
      console.log('🚗 Ride status updated to:', status);
    }
  };

  // Clear active ride
  const clearActiveRide = async () => {
    await setActiveRide(null);
  };

  // Load active ride from storage on app start
  useEffect(() => {
    const loadActiveRide = async () => {
      try {
        const savedRide = await AsyncStorage.getItem('activeRide');
        if (savedRide) {
          const ride = JSON.parse(savedRide) as ActiveRide;
          
          // Only restore if ride is still active (not completed or cancelled)
          if (['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(ride.status)) {
            setActiveRideState(ride);
            console.log('🚗 Restored active ride:', ride.rideId);
          } else {
            // Clean up completed/cancelled rides
            await AsyncStorage.removeItem('activeRide');
            console.log('🚗 Cleaned up completed ride');
          }
        }
      } catch (error) {
        console.error('Error loading active ride:', error);
      }
    };

    loadActiveRide();
  }, []);

  // Check if ride is currently active
  const isRideActive = activeRide !== null && 
    ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(activeRide.status);

  const contextValue: RideContextType = {
    activeRide,
    setActiveRide,
    updateRideStatus,
    clearActiveRide,
    isRideActive,
  };

  return (
    <RideContext.Provider value={contextValue}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = (): RideContextType => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};

export default RideContext;