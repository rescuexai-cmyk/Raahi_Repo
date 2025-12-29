class AppConfig {
  AppConfig._();

  // API Configuration
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  // WebSocket Configuration
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:8080',
  );

  // Google Maps API Key
  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );

  // Razorpay Configuration
  static const String razorpayKeyId = String.fromEnvironment(
    'RAZORPAY_KEY_ID',
    defaultValue: '',
  );

  // App Information
  static const String appName = 'RideApp';
  static const String appVersion = '1.0.0';

  // Default Location (Bangalore, India)
  static const double defaultLatitude = 12.9716;
  static const double defaultLongitude = 77.5946;

  // Ride Configuration
  static const int driverSearchRadius = 10000; // 10km in meters
  static const int driverRefreshInterval = 30; // seconds
  static const int maxRideRequestAttempts = 5;
  static const int rideRequestTimeout = 30; // seconds

  // Map Configuration
  static const double defaultZoom = 15.0;
  static const double minZoom = 10.0;
  static const double maxZoom = 20.0;

  // Cache Configuration
  static const int cacheMaxAge = 86400; // 24 hours in seconds
  static const int maxCacheSize = 100; // MB

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}


