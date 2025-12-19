class AppRoutes {
  AppRoutes._();

  // Auth routes
  static const String login = '/login';
  static const String signup = '/signup';
  static const String otpVerification = '/otp-verification';
  static const String phoneNumber = '/phone-number';

  // Main app routes
  static const String home = '/';
  static const String history = '/history';
  static const String profile = '/profile';

  // Ride routes
  static const String rideDetails = '/ride/:rideId';
  static const String rideTracking = '/ride/:rideId/tracking';
  static const String rideChat = '/ride/:rideId/chat';
  static const String rideBooking = '/booking';

  // Driver routes
  static const String driverHome = '/driver';
  static const String driverProfile = '/driver/profile';

  // Payment routes
  static const String payment = '/payment';
  static const String paymentMethods = '/payment/methods';

  // Settings
  static const String settings = '/settings';
  static const String notifications = '/settings/notifications';

  // Helper methods for dynamic routes
  static String rideDetailsPath(String rideId) => '/ride/$rideId';
  static String rideTrackingPath(String rideId) => '/ride/$rideId/tracking';
  static String rideChatPath(String rideId) => '/ride/$rideId/chat';
}


