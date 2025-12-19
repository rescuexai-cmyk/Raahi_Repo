class AppConfig {
  AppConfig._();

  // API Configuration
  // Use your computer's local IP for real device, or 10.0.2.2 for emulator
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://192.168.1.51:3000/api',
  );

  // WebSocket Configuration
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://192.168.1.51:3000/ws',
  );

  // Google Maps API Key
  static const String googleMapsApiKey = String.fromEnvironment(
    'GOOGLE_MAPS_API_KEY',
    defaultValue: 'AIzaSyAaTuhvB_WuJosSUXfgMyhMxAD-6sEmfVc',
  );
  
  // Check if Maps API is properly configured
  static bool get isMapsConfigured => googleMapsApiKey.isNotEmpty && googleMapsApiKey != 'YOUR_API_KEY_HERE';

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


