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
        print('📤 API Request: ${options.method} ${options.path}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        print('📥 API Response: ${response.statusCode} ${response.requestOptions.path}');
        return handler.next(response);
      },
      onError: (error, handler) {
        print('❌ API Error: ${error.response?.statusCode} ${error.requestOptions.path}');
        print('   ${error.message}');
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

  String? get authToken => _authToken;

  // ============================================
  // Authentication
  // ============================================
  
  Future<Map<String, dynamic>> requestOTP(String phone, {String countryCode = '+91'}) async {
    try {
      final response = await _dio.post('/auth/request-otp', data: {
        'phone': '$countryCode$phone',
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      print('Request OTP error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOTP(
    String sessionId,
    String otp, {
    String? phone,
    Map<String, dynamic>? userData,
  }) async {
    try {
      final response = await _dio.post('/auth/verify-otp', data: {
        'sessionId': sessionId,
        'otp': otp,
        if (userData != null) 'userData': userData,
      });
      
      final data = response.data as Map<String, dynamic>;
      
      // Auto-set auth token if present
      if (data['token'] != null) {
        setAuthToken(data['token'] as String);
      }
      
      return data;
    } catch (e) {
      print('Verify OTP error: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    _authToken = null;
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  // ============================================
  // User management
  // ============================================
  
  Future<Map<String, dynamic>> getUserProfile() async {
    final response = await _dio.get('/users/profile');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateUser(String userId, Map<String, dynamic> userData) async {
    final response = await _dio.put('/users/profile', data: userData);
    return response.data as Map<String, dynamic>;
  }

  Future<void> updateUserLocation(double lat, double lng) async {
    await _dio.post('/users/location', data: {
      'lat': lat,
      'lng': lng,
    });
  }

  // ============================================
  // Driver management
  // ============================================
  
  Future<List<dynamic>> getNearbyDrivers(double lat, double lng, {int radius = 5000, String? vehicleType}) async {
    try {
      final response = await _dio.get('/drivers/nearby', queryParameters: {
        'lat': lat,
        'lng': lng,
        'radius': radius,
        if (vehicleType != null) 'vehicleType': vehicleType,
      });
      
      final data = response.data;
      if (data is Map<String, dynamic> && data['drivers'] != null) {
        return data['drivers'] as List<dynamic>;
      }
      return data as List<dynamic>;
    } catch (e) {
      print('Get nearby drivers error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getDriverById(String driverId) async {
    final response = await _dio.get('/drivers/$driverId');
    return response.data as Map<String, dynamic>;
  }

  Future<void> updateDriverLocation(String driverId, double lat, double lng, {double? heading}) async {
    await _dio.post('/drivers/location', data: {
      'lat': lat,
      'lng': lng,
      if (heading != null) 'heading': heading,
    });
  }

  Future<void> updateDriverStatus(String driverId, String status, {bool? isAvailable}) async {
    await _dio.post('/drivers/status', data: {
      'status': status,
      if (isAvailable != null) 'isAvailable': isAvailable,
    });
  }

  Future<Map<String, dynamic>> getDriverProfile() async {
    final response = await _dio.get('/drivers/profile');
    return response.data as Map<String, dynamic>;
  }

  // ============================================
  // Ride management
  // ============================================
  
  Future<Map<String, dynamic>> createRide(Map<String, dynamic> rideData) async {
    try {
      final response = await _dio.post('/rides/request', data: rideData);
      return response.data as Map<String, dynamic>;
    } catch (e) {
      print('Create ride error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRide(String rideId) async {
    final response = await _dio.get('/rides/$rideId');
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getUserRides(String userId) async {
    try {
      final response = await _dio.get('/rides');
      final data = response.data;
      if (data is Map<String, dynamic> && data['rides'] != null) {
        return data['rides'] as List<dynamic>;
      }
      return data as List<dynamic>;
    } catch (e) {
      print('Get user rides error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> acceptRide(String rideId) async {
    final response = await _dio.put('/rides/$rideId/accept');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> startRide(String rideId) async {
    final response = await _dio.put('/rides/$rideId/start');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> completeRide(String rideId) async {
    final response = await _dio.put('/rides/$rideId/complete');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> cancelRide(String rideId, {String? reason}) async {
    try {
      final response = await _dio.put('/rides/$rideId/cancel', data: {
        if (reason != null) 'reason': reason,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      print('Cancel ride error: $e');
      rethrow;
    }
  }

  Future<void> updateRideStatus(String rideId, String status) async {
    await _dio.put('/rides/$rideId/$status');
  }

  Future<void> submitRideRating(String rideId, double rating, {String? feedback}) async {
    await _dio.post('/rides/$rideId/rate', data: {
      'rating': rating,
      if (feedback != null && feedback.isNotEmpty) 'feedback': feedback,
    });
  }

  Future<Map<String, dynamic>> getRideReceipt(String rideId) async {
    final response = await _dio.get('/rides/$rideId');
    return response.data as Map<String, dynamic>;
  }

  // ============================================
  // Maps & Fare Estimation
  // ============================================
  
  Future<Map<String, dynamic>> getFareEstimate({
    required double pickupLat,
    required double pickupLng,
    required double destLat,
    required double destLng,
    required String rideType,
  }) async {
    try {
      final response = await _dio.post('/maps/fare-estimate', data: {
        'pickupLocation': {'lat': pickupLat, 'lng': pickupLng},
        'destinationLocation': {'lat': destLat, 'lng': destLng},
        'rideType': rideType,
      });
      return response.data as Map<String, dynamic>;
    } catch (e) {
      print('Get fare estimate error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getDirections({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    final response = await _dio.get('/maps/directions', queryParameters: {
      'origin': '$originLat,$originLng',
      'destination': '$destLat,$destLng',
    });
    return response.data as Map<String, dynamic>;
  }

  // Legacy methods for compatibility
  Future<Map<String, dynamic>> createRideRequest(Map<String, dynamic> requestData) async {
    return createRide(requestData);
  }

  Future<void> acceptRideRequest(String requestId, String driverId) async {
    await acceptRide(requestId);
  }

  Future<void> rejectRideRequest(String requestId, String driverId) async {
    await cancelRide(requestId, reason: 'Driver rejected');
  }

  Future<Map<String, dynamic>> registerDriver(Map<String, dynamic> driverData) async {
    // Drivers would register through normal auth + additional info
    throw UnimplementedError('Driver registration through separate flow');
  }

  Future<Map<String, dynamic>> createPayment(Map<String, dynamic> paymentData) async {
    throw UnimplementedError('Payment integration not implemented');
  }

  Future<Map<String, dynamic>> processPayment(String paymentId, Map<String, dynamic> paymentDetails) async {
    throw UnimplementedError('Payment integration not implemented');
  }
}

// Singleton instance
final apiClient = ApiClient();
