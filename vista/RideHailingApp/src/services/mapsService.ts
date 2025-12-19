import { EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } from '@env';

// Google Maps API service for ride-hailing functionality
class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file');
    }
  }

  // Geocoding: Convert address to coordinates
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.baseUrl}/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          types: result.types,
          addressComponents: result.address_components
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse Geocoding: Convert coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
    try {
      const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components,
          types: result.types
        };
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  // Get directions between two points
  async getDirections(
    origin: LocationCoordinate,
    destination: LocationCoordinate,
    waypoints?: LocationCoordinate[],
    options: DirectionsOptions = {}
  ): Promise<DirectionsResult | null> {
    try {
      const originStr = `${origin.lat},${origin.lng}`;
      const destinationStr = `${destination.lat},${destination.lng}`;
      
      let url = `${this.baseUrl}/directions/json?origin=${originStr}&destination=${destinationStr}&key=${this.apiKey}`;
      
      // Add optional parameters
      if (options.mode) {
        url += `&mode=${options.mode}`;
      }
      if (options.avoid) {
        url += `&avoid=${options.avoid.join('|')}`;
      }
      if (options.language) {
        url += `&language=${options.language}`;
      }
      if (options.region) {
        url += `&region=${options.region}`;
      }
      
      // Add waypoints
      if (waypoints && waypoints.length > 0) {
        const waypointsStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
        url += `&waypoints=${waypointsStr}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          distance: leg.distance,
          duration: leg.duration,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          steps: leg.steps,
          polyline: route.overview_polyline.points,
          bounds: route.bounds,
          copyrights: route.copyrights,
          warnings: route.warnings,
          waypointOrder: route.waypoint_order
        };
      }
      
      return null;
    } catch (error) {
      console.error('Directions error:', error);
      return null;
    }
  }

  // Calculate distance and duration between multiple points
  async getDistanceMatrix(
    origins: LocationCoordinate[],
    destinations: LocationCoordinate[],
    options: DistanceMatrixOptions = {}
  ): Promise<DistanceMatrixResult | null> {
    try {
      const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
      const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
      
      let url = `${this.baseUrl}/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${this.apiKey}`;
      
      if (options.mode) {
        url += `&mode=${options.mode}`;
      }
      if (options.avoid) {
        url += `&avoid=${options.avoid.join('|')}`;
      }
      if (options.units) {
        url += `&units=${options.units}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return {
          originAddresses: data.origin_addresses,
          destinationAddresses: data.destination_addresses,
          rows: data.rows
        };
      }
      
      return null;
    } catch (error) {
      console.error('Distance matrix error:', error);
      return null;
    }
  }

  // Places Autocomplete for address suggestions
  async getPlacesSuggestions(
    input: string,
    location?: LocationCoordinate,
    radius?: number
  ): Promise<PlaceSuggestion[]> {
    try {
      let url = `${this.baseUrl}/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}`;
      
      if (location) {
        url += `&location=${location.lat},${location.lng}`;
      }
      if (radius) {
        url += `&radius=${radius}`;
      }
      
      // Restrict to addresses and establishments
      url += '&types=address|establishment';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          structuredFormatting: prediction.structured_formatting,
          types: prediction.types
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Places suggestions error:', error);
      return [];
    }
  }

  // Get place details from place ID
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name,types&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const result = data.result;
        return {
          placeId,
          name: result.name,
          formattedAddress: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          types: result.types
        };
      }
      
      return null;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }

  // Find nearby places (restaurants, gas stations, etc.)
  async findNearbyPlaces(
    location: LocationCoordinate,
    type: string,
    radius: number = 1000
  ): Promise<NearbyPlace[]> {
    try {
      const url = `${this.baseUrl}/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.results.map((place: any) => ({
          placeId: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types,
          openNow: place.opening_hours?.open_now
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Nearby places error:', error);
      return [];
    }
  }

  // Decode polyline string to coordinates array
  decodePolyline(polyline: string): LocationCoordinate[] {
    const coordinates: LocationCoordinate[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < polyline.length) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;
      
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({
        lat: lat * 1e-5,
        lng: lng * 1e-5
      });
    }

    return coordinates;
  }

  // Calculate ETA based on traffic conditions
  async getETAWithTraffic(
    origin: LocationCoordinate,
    destination: LocationCoordinate
  ): Promise<ETAResult | null> {
    try {
      const directions = await this.getDirections(origin, destination, undefined, {
        mode: 'driving'
      });
      
      if (directions) {
        // Get real-time traffic data
        const trafficUrl = `${this.baseUrl}/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`;
        
        const response = await fetch(trafficUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          
          return {
            distance: directions.distance,
            duration: directions.duration,
            durationInTraffic: leg.duration_in_traffic || directions.duration,
            trafficDelay: leg.duration_in_traffic ? 
              leg.duration_in_traffic.value - directions.duration.value : 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('ETA with traffic error:', error);
      return null;
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Calculate fare estimate based on distance and time
  calculateFareEstimate(distance: number, duration: number, rideType: string = 'economy'): FareEstimate {
    // Base fare rates (per km and per minute)
    const rates = {
      economy: { baseRate: 10, perKm: 8, perMinute: 1 },
      comfort: { baseRate: 15, perKm: 12, perMinute: 1.5 },
      premium: { baseRate: 25, perKm: 18, perMinute: 2 },
      xl: { baseRate: 20, perKm: 15, perMinute: 1.8 }
    };

    const rate = rates[rideType as keyof typeof rates] || rates.economy;
    const distanceKm = distance / 1000;
    const durationMinutes = duration / 60;

    const baseFare = rate.baseRate;
    const distanceFare = distanceKm * rate.perKm;
    const timeFare = durationMinutes * rate.perMinute;
    
    const subtotal = baseFare + distanceFare + timeFare;
    const taxes = subtotal * 0.05; // 5% tax
    const total = subtotal + taxes;

    return {
      rideType,
      baseFare,
      distanceFare,
      timeFare,
      subtotal,
      taxes,
      total,
      currency: 'INR',
      estimatedDistance: distanceKm,
      estimatedDuration: durationMinutes
    };
  }
}

// Create singleton instance
export const googleMapsService = new GoogleMapsService();

// Type definitions
export interface LocationCoordinate {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
  types: string[];
  addressComponents: any[];
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  placeId: string;
  addressComponents: any[];
  types: string[];
}

export interface DirectionsResult {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  startAddress: string;
  endAddress: string;
  steps: any[];
  polyline: string;
  bounds: any;
  copyrights: string;
  warnings: string[];
  waypointOrder?: number[];
}

export interface DirectionsOptions {
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  avoid?: ('tolls' | 'highways' | 'ferries' | 'indoor')[];
  language?: string;
  region?: string;
}

export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: any[];
}

export interface DistanceMatrixOptions {
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  avoid?: ('tolls' | 'highways' | 'ferries' | 'indoor')[];
  units?: 'metric' | 'imperial';
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  structuredFormatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  types: string[];
  openNow?: boolean;
}

export interface ETAResult {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  durationInTraffic: { text: string; value: number };
  trafficDelay: number;
}

export interface FareEstimate {
  rideType: string;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  estimatedDistance: number;
  estimatedDuration: number;
  distance?: number;
  estimatedTime?: number;
}