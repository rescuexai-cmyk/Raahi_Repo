import { useEffect, useState, useCallback } from 'react';
import { webSocketService, RideLocationUpdate, RideStatusUpdate } from '../services/websocketService';
import { useAuth } from '../context/AuthContext';

interface RideTrackingData {
  rideId: string;
  status: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
  speed?: number;
  heading?: number;
  estimatedArrival?: number;
  lastUpdate: number;
}

interface RealTimeTrackingHook {
  trackingData: RideTrackingData | null;
  isConnected: boolean;
  connectionState: string;
  error: string | null;
  sendMessage: (message: string) => void;
  startTracking: (rideId: string) => void;
  stopTracking: () => void;
}

export const useRealTimeTracking = (rideId?: string): RealTimeTrackingHook => {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState<RideTrackingData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    setIsConnected(webSocketService.isConnected());
    setConnectionState(webSocketService.getConnectionState());
  }, []);

  // Handle ride updates
  const handleRideUpdate = useCallback((data: any) => {
    setTrackingData(prev => ({
      rideId: data.rideId || prev?.rideId || '',
      status: data.status || prev?.status || 'unknown',
      driverLocation: data.driverLocation || prev?.driverLocation,
      speed: data.speed || prev?.speed,
      heading: data.heading || prev?.heading,
      estimatedArrival: data.estimatedArrival || prev?.estimatedArrival,
      lastUpdate: Date.now()
    }));
  }, []);

  // Start tracking a ride
  const startTracking = useCallback((rideId: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setCurrentRideId(rideId);
    setError(null);

    // Initialize tracking data
    setTrackingData({
      rideId,
      status: 'unknown',
      lastUpdate: Date.now()
    });

    // Join ride tracking room
    webSocketService.joinRideTracking(rideId);
  }, [user]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (currentRideId) {
      webSocketService.leaveRideTracking(currentRideId);
      setCurrentRideId(null);
      setTrackingData(null);
    }
  }, [currentRideId]);

  // Send message to ride participants
  const sendMessage = useCallback((message: string) => {
    if (currentRideId) {
      webSocketService.sendRideMessage(currentRideId, message);
    }
  }, [currentRideId]);

  // Initialize WebSocket connection and subscriptions
  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    const setupConnection = async () => {
      try {
        // Connect to WebSocket if not already connected
        if (!webSocketService.isConnected()) {
          await webSocketService.connect();
        }

        updateConnectionStatus();

        // Subscribe to ride updates
        if (currentRideId) {
          unsubscribe = webSocketService.subscribeToRideUpdates(currentRideId, handleRideUpdate);
        }

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to setup real-time tracking:', err);
      }
    };

    setupConnection();

    // Update connection status every few seconds
    const statusInterval = setInterval(updateConnectionStatus, 3000);

    return () => {
      clearInterval(statusInterval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, currentRideId, handleRideUpdate, updateConnectionStatus]);

  // Auto-start tracking if rideId is provided
  useEffect(() => {
    if (rideId && rideId !== currentRideId) {
      startTracking(rideId);
    }
  }, [rideId, currentRideId, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    trackingData,
    isConnected,
    connectionState,
    error,
    sendMessage,
    startTracking,
    stopTracking
  };
};

// Hook for driver-specific real-time features
export const useDriverRealTime = () => {
  const { user } = useAuth();
  const [newRideRequests, setNewRideRequests] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);

  const updateLocation = useCallback((location: { latitude: number; longitude: number }, speed?: number, heading?: number) => {
    if (user && user.user_type === 'driver') {
      // This would typically also update the database
      webSocketService.updateDriverLocation({
        rideId: '', // This would be filled in by the active ride
        driverLocation: location,
        speed,
        heading
      });
    }
  }, [user]);

  const setAvailability = useCallback((available: boolean) => {
    if (user && user.user_type === 'driver') {
      setIsAvailable(available);
      webSocketService.updateDriverAvailability(available);
    }
  }, [user]);

  const acceptRide = useCallback((rideId: string) => {
    if (user && user.user_type === 'driver') {
      webSocketService.acceptRide(rideId);
      
      // Remove from new requests
      setNewRideRequests(prev => prev.filter(req => req.rideId !== rideId));
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.user_type !== 'driver') return;

    const unsubscribe = webSocketService.subscribeToDriverEvents((data) => {
      switch (data.type) {
        case 'new_ride_request':
          setNewRideRequests(prev => [...prev, data]);
          break;
        case 'ride_cancelled':
          setNewRideRequests(prev => prev.filter(req => req.rideId !== data.rideId));
          break;
      }
    });

    return unsubscribe;
  }, [user]);

  return {
    newRideRequests,
    isAvailable,
    updateLocation,
    setAvailability,
    acceptRide
  };
};

// Hook for rider-specific real-time features
export const useRiderRealTime = () => {
  const { user } = useAuth();
  const [activeRide, setActiveRide] = useState<any>(null);

  const requestRide = useCallback((rideData: any) => {
    if (user && user.user_type === 'rider') {
      webSocketService.requestRide(rideData);
    }
  }, [user]);

  const cancelRide = useCallback((rideId: string, reason?: string) => {
    if (user && user.user_type === 'rider') {
      webSocketService.cancelRide(rideId, reason);
    }
  }, [user]);

  return {
    activeRide,
    requestRide,
    cancelRide
  };
};