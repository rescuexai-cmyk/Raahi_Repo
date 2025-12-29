import 'package:dio/dio.dart';
import '../config/app_config.dart';

class ApiClient {
  late final Dio _dio;
  String? _authToken;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // Handle token refresh or logout on 401
        if (error.response?.statusCode == 401) {
          // Token expired - could trigger refresh logic here
        }
        return handler.next(error);
      },
    ));
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  // Authentication
  Future<Map<String, dynamic>> requestOTP(String phone, {String countryCode = '+91'}) async {
    final response = await _dio.post('/auth/send-otp', data: {
      'phone': phone,
      'countryCode': countryCode,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> verifyOTP(String phone, String otp, {String countryCode = '+91'}) async {
    final response = await _dio.post('/auth/verify-otp', data: {
      'phone': phone,
      'otp': otp,
      'countryCode': countryCode,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> signOut() async {
    await _dio.post('/auth/logout');
  }

  // User management
  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateUser(String userId, Map<String, dynamic> userData) async {
    final response = await _dio.put('/auth/profile', data: userData);
    return response.data as Map<String, dynamic>;
  }

  // Driver management
  Future<List<dynamic>> getNearbyDrivers(double lat, double lng, {int radius = 5000}) async {
    final response = await _dio.get('/drivers/nearby', queryParameters: {
      'lat': lat,
      'lng': lng,
      'radius': radius,
    });
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getDriverById(String driverId) async {
    final response = await _dio.get('/drivers/$driverId');
    return response.data as Map<String, dynamic>;
  }

  Future<void> updateDriverLocation(String driverId, double lat, double lng, {double? heading}) async {
    await _dio.put('/drivers/$driverId/location', data: {
      'location': {'lat': lat, 'lng': lng},
      if (heading != null) 'heading': heading,
    });
  }

  Future<void> updateDriverStatus(String driverId, String status) async {
    await _dio.put('/drivers/$driverId/status', data: {'status': status});
  }

  Future<Map<String, dynamic>> registerDriver(Map<String, dynamic> driverData) async {
    final response = await _dio.post('/drivers/register', data: driverData);
    return response.data as Map<String, dynamic>;
  }

  // Ride management
  Future<Map<String, dynamic>> createRide(Map<String, dynamic> rideData) async {
    final response = await _dio.post('/rides', data: rideData);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getRide(String rideId) async {
    final response = await _dio.get('/rides/$rideId');
    return response.data as Map<String, dynamic>;
  }

  Future<void> updateRideStatus(String rideId, String status) async {
    await _dio.put('/rides/$rideId/status', data: {'status': status});
  }

  Future<void> submitRideRating(String rideId, double rating, {String? feedback}) async {
    await _dio.post('/rides/$rideId/rating', data: {
      'rating': rating,
      if (feedback != null && feedback.isNotEmpty) 'feedback': feedback,
    });
  }

  Future<Map<String, dynamic>> getRideReceipt(String rideId) async {
    final response = await _dio.get('/rides/$rideId/receipt');
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getUserRides(String userId) async {
    final response = await _dio.get('/users/$userId/rides');
    return response.data as List<dynamic>;
  }

  // Ride requests
  Future<Map<String, dynamic>> createRideRequest(Map<String, dynamic> requestData) async {
    final response = await _dio.post('/ride-requests', data: requestData);
    return response.data as Map<String, dynamic>;
  }

  Future<void> acceptRideRequest(String requestId, String driverId) async {
    await _dio.post('/ride-requests/$requestId/accept', data: {'driverId': driverId});
  }

  Future<void> rejectRideRequest(String requestId, String driverId) async {
    await _dio.post('/ride-requests/$requestId/reject', data: {'driverId': driverId});
  }

  // Payments
  Future<Map<String, dynamic>> createPayment(Map<String, dynamic> paymentData) async {
    final response = await _dio.post('/payments', data: paymentData);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> processPayment(String paymentId, Map<String, dynamic> paymentDetails) async {
    final response = await _dio.post('/payments/$paymentId/process', data: paymentDetails);
    return response.data as Map<String, dynamic>;
  }
}

// Singleton instance
final apiClient = ApiClient();


