// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  avatar_url?: string;
  user_type: 'rider' | 'driver' | 'both';
  created_at: string;
  updated_at: string;
  user_metadata?: {
    avatar_url?: string;
    name?: string;
    user_type?: string;
  };
}

// Driver specific data
export interface Driver extends User {
  vehicle_info: VehicleInfo;
  license_number: string;
  is_verified: boolean;
  is_available: boolean;
  current_location?: Location;
  rating: number;
  total_rides: number;
  status: 'available' | 'busy' | 'offline' | 'on_ride';
  avatar?: string;
}

// Vehicle information
export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vehicle_type: 'economy' | 'comfort' | 'premium' | 'xl';
}

// Location type
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

// Ride types
export interface Ride {
  id: string;
  rider_id: string;
  driver_id?: string;
  pickup_location: Location;
  destination_location: Location;
  status: RideStatus;
  fare: number;
  distance: number;
  estimated_duration: number;
  ride_type: 'economy' | 'comfort' | 'premium' | 'xl';
  payment_method: 'cash' | 'card' | 'digital_wallet';
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  rating?: number;
  notes?: string;
}

export type RideStatus = 
  | 'requested' 
  | 'accepted' 
  | 'arriving' 
  | 'driver_arriving'
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Profile: undefined;
  Login: undefined;
  SignUp: undefined;
  RideDetails: { rideId: string };
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}