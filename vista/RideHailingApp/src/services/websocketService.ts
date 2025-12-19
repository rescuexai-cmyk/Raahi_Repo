import { getStoredToken } from './authService';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface RideLocationUpdate {
  rideId: string;
  driverLocation: {
    latitude: number;
    longitude: number;
  };
  speed?: number;
  heading?: number;
}

interface RideStatusUpdate {
  rideId: string;
  status: string;
  driverId?: string;
  estimatedArrival?: number;
}

type WebSocketListener = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, WebSocketListener[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private wsUrl: string;

  constructor() {
    this.wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';
  }

  // Connect to WebSocket server
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      this.ws = new WebSocket(`${this.wsUrl}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.sendMessage('auth', { token });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.reconnect(), this.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
    }
  }

  // Reconnect to WebSocket
  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    console.log(`WebSocket reconnect attempt ${this.reconnectAttempts}`);
    
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    await this.connect();
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  // Send message to WebSocket server
  private sendMessage(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }

    // Also notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(listener => listener(message));
    }
  }

  // Subscribe to message type
  subscribe(messageType: string, listener: WebSocketListener): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    
    this.listeners.get(messageType)!.push(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(messageType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Subscribe to all messages
  subscribeToAll(listener: WebSocketListener): () => void {
    return this.subscribe('*', listener);
  }

  // Real-time tracking methods

  // Join ride tracking room
  joinRideTracking(rideId: string): void {
    this.sendMessage('join_ride', { rideId });
  }

  // Leave ride tracking room
  leaveRideTracking(rideId: string): void {
    this.sendMessage('leave_ride', { rideId });
  }

  // Send driver location update
  updateDriverLocation(update: RideLocationUpdate): void {
    this.sendMessage('driver_location_update', update);
  }

  // Send ride status update
  updateRideStatus(update: RideStatusUpdate): void {
    this.sendMessage('ride_status_update', update);
  }

  // Send driver availability status
  updateDriverAvailability(isAvailable: boolean): void {
    this.sendMessage('driver_availability', { isAvailable });
  }

  // Request ride (rider)
  requestRide(rideData: any): void {
    this.sendMessage('ride_request', rideData);
  }

  // Accept ride (driver)
  acceptRide(rideId: string): void {
    this.sendMessage('accept_ride', { rideId });
  }

  // Cancel ride
  cancelRide(rideId: string, reason?: string): void {
    this.sendMessage('cancel_ride', { rideId, reason });
  }

  // Send message to ride participants
  sendRideMessage(rideId: string, message: string): void {
    this.sendMessage('ride_message', { rideId, message });
  }

  // Subscribe to ride-specific events
  subscribeToRideUpdates(rideId: string, callback: (data: any) => void): () => void {
    const unsubscribers = [
      this.subscribe('ride_status_update', (message) => {
        if (message.data.rideId === rideId) {
          callback({ type: 'status_update', ...message.data });
        }
      }),
      this.subscribe('driver_location_update', (message) => {
        if (message.data.rideId === rideId) {
          callback({ type: 'location_update', ...message.data });
        }
      }),
      this.subscribe('ride_message', (message) => {
        if (message.data.rideId === rideId) {
          callback({ type: 'message', ...message.data });
        }
      }),
      this.subscribe('ride_cancelled', (message) => {
        if (message.data.rideId === rideId) {
          callback({ type: 'cancelled', ...message.data });
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  // Subscribe to driver-specific events
  subscribeToDriverEvents(callback: (data: any) => void): () => void {
    const unsubscribers = [
      this.subscribe('ride_request', (message) => {
        callback({ type: 'new_ride_request', ...message.data });
      }),
      this.subscribe('ride_cancelled', (message) => {
        callback({ type: 'ride_cancelled', ...message.data });
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  // Check connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Export types for use in components
export type { RideLocationUpdate, RideStatusUpdate, WebSocketMessage };