import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/models/user.dart';
import '../../../core/services/api_client.dart';
import '../../../core/services/websocket_service.dart';

// Auth state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// OTP Result
class OTPResult {
  final bool success;
  final String? sessionId;
  final String? error;
  final int? expiresIn;
  final bool isNewUser;
  final String? demoOtp; // For development

  const OTPResult({
    required this.success,
    this.sessionId,
    this.error,
    this.expiresIn,
    this.isNewUser = false,
    this.demoOtp,
  });
}

// Verify OTP Result
class VerifyOTPResult {
  final bool success;
  final User? user;
  final String? token;
  final String? error;
  final bool isNewUser;

  const VerifyOTPResult({
    required this.success,
    this.user,
    this.token,
    this.error,
    this.isNewUser = false,
  });
}

// Auth notifier
class AuthNotifier extends Notifier<AuthState> {
  late final FlutterSecureStorage _secureStorage;
  static const _tokenKey = 'auth_token';
  static const _userKey = 'user_data';
  static const _countryCode = '+91';
  
  // Store the session ID from requestOTP for use in verifyOTP
  String? _currentSessionId;

  @override
  AuthState build() {
    _secureStorage = ref.watch(secureStorageProvider);
    _initializeAuth();
    return const AuthState(isLoading: true);
  }

  Future<void> _initializeAuth() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      
      if (token != null) {
        apiClient.setAuthToken(token);
        
        try {
          final response = await apiClient.getCurrentUser();
          final userData = response['user'] as Map<String, dynamic>?;
          
          if (userData != null) {
            final user = _mapUser(userData);
            
            // Connect to WebSocket
            try {
              await webSocketService.connect(token: token);
            } catch (e) {
              print('WebSocket connection failed: $e');
            }
            
            state = AuthState(user: user);
            return;
          }
        } catch (e) {
          print('Failed to get current user: $e');
          // Token might be expired
          await _secureStorage.delete(key: _tokenKey);
        }
      }
      
      state = const AuthState();
    } catch (e) {
      print('Auth initialization error: $e');
      state = AuthState(error: e.toString());
    }
  }

  Future<OTPResult> requestOTP(String phone) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final response = await apiClient.requestOTP(phone, countryCode: _countryCode);
      
      final success = response['success'] as bool? ?? false;
      final sessionId = response['sessionId'] as String?;
      final expiresIn = response['expiresIn'] as int?;
      final isNewUser = response['isNewUser'] as bool? ?? false;
      final demoOtp = response['demoOtp'] as String?;
      
      // Store session ID for verification
      _currentSessionId = sessionId;
      
      state = state.copyWith(isLoading: false);
      
      print('📱 OTP requested - Session: $sessionId, Demo OTP: $demoOtp');
      
      return OTPResult(
        success: success,
        sessionId: sessionId,
        expiresIn: expiresIn,
        isNewUser: isNewUser,
        demoOtp: demoOtp,
      );
    } catch (e) {
      print('Request OTP error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
      return OTPResult(success: false, error: e.toString());
    }
  }

  Future<VerifyOTPResult> verifyOTP(String phone, String otp, {String? name}) async {
    state = state.copyWith(isLoading: true, error: null);
    
    if (_currentSessionId == null) {
      state = state.copyWith(isLoading: false);
      return const VerifyOTPResult(
        success: false,
        error: 'No active OTP session. Please request OTP again.',
      );
    }
    
    try {
      final response = await apiClient.verifyOTP(
        _currentSessionId!,
        otp,
        phone: '$_countryCode$phone',
        userData: name != null ? {'name': name, 'user_type': 'rider'} : null,
      );
      
      final success = response['success'] as bool? ?? false;

      if (!success) {
        state = state.copyWith(isLoading: false);
        return VerifyOTPResult(
          success: false,
          error: response['error'] as String? ?? 'Verification failed',
        );
      }

      final userJson = response['user'] as Map<String, dynamic>?;
      final token = response['token'] as String?;
      
      if (userJson == null) {
        state = state.copyWith(isLoading: false);
        return const VerifyOTPResult(
          success: false,
          error: 'Invalid response from server',
        );
      }

      final user = _mapUser(userJson);

      if (token != null) {
        await _secureStorage.write(key: _tokenKey, value: token);
        apiClient.setAuthToken(token);
        
        try {
          await webSocketService.connect(token: token);
        } catch (e) {
          print('WebSocket connection failed: $e');
        }
      }

      // Clear session ID
      _currentSessionId = null;
      
      state = AuthState(user: user);

      return VerifyOTPResult(
        success: true,
        user: user,
        token: token,
        isNewUser: false,
      );
    } catch (e) {
      print('Verify OTP error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
      return VerifyOTPResult(success: false, error: e.toString());
    }
  }

  Future<OTPResult> resendOTP(String phone) => requestOTP(phone);

  /// Demo login with dummy user data - bypasses OTP verification
  Future<void> demoLogin() async {
    state = state.copyWith(isLoading: true, error: null);
    
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 500));
    
    final demoUser = User(
      id: 'demo-user-001',
      email: 'demo@rideapp.com',
      phone: '+91 9876543210',
      name: 'Demo User',
      avatarUrl: null,
      userType: UserType.rider,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      userMetadata: {'isDemo': true},
    );
    
    // Save demo token
    await _secureStorage.write(key: _tokenKey, value: 'demo-token-123');
    
    state = AuthState(user: demoUser);
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    
    try {
      webSocketService.disconnect();
      await apiClient.signOut();
    } catch (e) {
      // Continue with local sign out even if API fails
    }
    
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
    // Clear any active ride state
    await _secureStorage.delete(key: 'current_ride_state');
    apiClient.setAuthToken(null);
    _currentSessionId = null;
    
    state = const AuthState();
  }

  Future<void> updateUser(User user) async {
    state = state.copyWith(user: user);
  }

  User _mapUser(Map<String, dynamic> json) {
    // Handle backend's user format
    final name = json['name'] as String? ?? json['phone'] as String? ?? 'User';
    
    return User(
      id: json['id'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      name: name,
      avatarUrl: json['avatarUrl'] as String?,
      userType: _parseUserType(json['userType'] as String?),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      rating: (json['rating'] as num?)?.toDouble(),
      totalRides: json['totalRides'] as int? ?? 0,
      userMetadata: null,
    );
  }
  
  UserType _parseUserType(String? type) {
    switch (type?.toLowerCase()) {
      case 'driver':
        return UserType.driver;
      case 'admin':
        return UserType.admin;
      default:
        return UserType.rider;
    }
  }
}

// Providers
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

final authStateProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});

// Convenience providers
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authStateProvider).user != null;
});

final isLoadingAuthProvider = Provider<bool>((ref) {
  return ref.watch(authStateProvider).isLoading;
});
