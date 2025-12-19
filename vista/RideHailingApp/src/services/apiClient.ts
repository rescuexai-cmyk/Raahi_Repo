import { EXPO_PUBLIC_API_URL } from '@env';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async requestOTP(phone: string) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(sessionId: string, otp: string, userData?: any) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId, otp, userData }),
    });
  }

  async signOut() {
    return this.request('/auth/signout', {
      method: 'POST',
    });
  }

  // User management
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Driver management
  async getNearbyDrivers(location: { lat: number; lng: number }, radius: number = 5000) {
    return this.request(`/drivers/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
  }

  async getDriverById(driverId: string) {
    return this.request(`/drivers/${driverId}`);
  }

  async updateDriverLocation(driverId: string, location: { lat: number; lng: number }, heading?: number) {
    return this.request(`/drivers/${driverId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ location, heading }),
    });
  }

  async updateDriverStatus(driverId: string, status: string) {
    return this.request(`/drivers/${driverId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async registerDriver(driverData: any) {
    return this.request('/drivers/register', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
  }

  // Ride management
  async createRide(rideData: any) {
    return this.request('/rides', {
      method: 'POST',
      body: JSON.stringify(rideData),
    });
  }

  async getRide(rideId: string) {
    return this.request(`/rides/${rideId}`);
  }

  async updateRideStatus(rideId: string, status: string) {
    return this.request(`/rides/${rideId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getUserRides(userId: string) {
    return this.request(`/users/${userId}/rides`);
  }

  // Ride requests
  async createRideRequest(requestData: any) {
    return this.request('/ride-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async acceptRideRequest(requestId: string, driverId: string) {
    return this.request(`/ride-requests/${requestId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    });
  }

  async rejectRideRequest(requestId: string, driverId: string) {
    return this.request(`/ride-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    });
  }

  // Payments
  async createPayment(paymentData: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async processPayment(paymentId: string, paymentDetails: any) {
    return this.request(`/payments/${paymentId}/process`, {
      method: 'POST',
      body: JSON.stringify(paymentDetails),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;