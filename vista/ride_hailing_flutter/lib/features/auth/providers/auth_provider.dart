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

  const OTPResult({
    required this.success,
    this.sessionId,
    this.error,
    this.expiresIn,
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
class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _secureStorage;
  static const _tokenKey = 'auth_token';
  static const _userKey = 'user_data';
  static const _countryCode = '+91';

  AuthNotifier(this._secureStorage) : super(const AuthState(isLoading: true)) {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      
      if (token != null) {
        apiClient.setAuthToken(token);
        
        try {
          final userData = await apiClient.getCurrentUser();
          final user = User.fromJson(userData);
          
          // Connect to WebSocket
          await webSocketService.connect(token: token);
          
          state = AuthState(user: user);
        } catch (e) {
          // Token might be expired
          await _secureStorage.delete(key: _tokenKey);
          state = const AuthState();
        }
      } else {
        state = const AuthState();
      }
    } catch (e) {
      state = AuthState(error: e.toString());
    }
  }

  Future<OTPResult> requestOTP(String phone) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final response = await apiClient.requestOTP(phone, countryCode: _countryCode);
      
      state = state.copyWith(isLoading: false);
      
      return OTPResult(
        success: response['success'] as bool? ?? true,
        sessionId: null,
        expiresIn: null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return OTPResult(success: false, error: e.toString());
    }
  }

  Future<VerifyOTPResult> verifyOTP(String phone, String otp) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final response = await apiClient.verifyOTP(phone, otp, countryCode: _countryCode);
      final success = response['success'] as bool? ?? false;

      if (!success) {
        state = state.copyWith(isLoading: false);
        return VerifyOTPResult(
          success: false,
          error: response['message'] as String? ?? 'Verification failed',
        );
      }

      final data = response['data'] as Map<String, dynamic>? ?? {};
      final tokens = data['tokens'] as Map<String, dynamic>? ?? {};
      final userJson = data['user'] as Map<String, dynamic>? ?? {};

      final user = _mapUser(userJson);
      final token = tokens['accessToken'] as String?;

      if (token != null) {
        await _secureStorage.write(key: _tokenKey, value: token);
        apiClient.setAuthToken(token);
        await webSocketService.connect(token: token);
      }

      state = AuthState(user: user);

      return VerifyOTPResult(
        success: true,
        user: user,
        token: token,
        isNewUser: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return VerifyOTPResult(success: false, error: e.toString());
    }
  }

  Future<OTPResult> resendOTP(String phone) => requestOTP(phone);

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
    apiClient.setAuthToken(null);
    
    state = const AuthState();
  }

  Future<void> updateUser(User user) async {
    state = state.copyWith(user: user);
  }

  User _mapUser(Map<String, dynamic> json) {
    final firstName = json['firstName'] as String? ?? '';
    final lastName = json['lastName'] as String? ?? '';
    final name = [firstName, lastName].where((p) => p.isNotEmpty).join(' ').trim();
    return User(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      name: name.isNotEmpty ? name : (json['phone'] as String? ?? 'User'),
      avatarUrl: json['profileImage'] as String?,
      userType: UserType.rider,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['lastLoginAt'] as String? ?? '') ?? DateTime.now(),
      userMetadata: null,
    );
  }
}

// Providers
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthNotifier(secureStorage);
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


