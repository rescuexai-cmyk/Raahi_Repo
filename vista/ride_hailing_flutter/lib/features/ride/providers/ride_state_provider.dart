import 'dart:convert';
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/models/location.dart';
import '../../../core/models/ride.dart';
import '../../../core/services/api_client.dart';

enum ActiveRideStatus {
  idle,
  searching,
  driverFound,
  driverArriving,
  inProgress,
  completed,
  cancelled,
}

class RideState {
  final ActiveRideStatus status;
  final String? rideId;
  final String? driverId;
  final String? driverName;
  final String? driverPhone;
  final String? driverRating;
  final String? driverAvatarUrl;
  final String? vehicleNumber;
  final String? vehicleType;
  final String? vehicleColor;
  final LocationCoordinate? pickupLocation;
  final LocationCoordinate? destinationLocation;
  final String? pickupAddress;
  final String? destinationAddress;
  final String? rideType;
  final double? fare;
  final double? distance;
  final int? duration;
  final DateTime? searchStartTime;
  final DateTime? rideStartTime;
  final String? rideOTP; // OTP for ride verification
  final String? error;

  const RideState({
    this.status = ActiveRideStatus.idle,
    this.rideId,
    this.driverId,
    this.driverName,
    this.driverPhone,
    this.driverRating,
    this.driverAvatarUrl,
    this.vehicleNumber,
    this.vehicleType,
    this.vehicleColor,
    this.pickupLocation,
    this.destinationLocation,
    this.pickupAddress,
    this.destinationAddress,
    this.rideType,
    this.fare,
    this.distance,
    this.duration,
    this.searchStartTime,
    this.rideStartTime,
    this.rideOTP,
    this.error,
  });

  bool get isActive => status == ActiveRideStatus.searching || 
                        status == ActiveRideStatus.driverFound ||
                        status == ActiveRideStatus.driverArriving ||
                        status == ActiveRideStatus.inProgress;

  bool get isSearching => status == ActiveRideStatus.searching;

  RideState copyWith({
    ActiveRideStatus? status,
    String? rideId,
    String? driverId,
    String? driverName,
    String? driverPhone,
    String? driverRating,
    String? driverAvatarUrl,
    String? vehicleNumber,
    String? vehicleType,
    String? vehicleColor,
    LocationCoordinate? pickupLocation,
    LocationCoordinate? destinationLocation,
    String? pickupAddress,
    String? destinationAddress,
    String? rideType,
    double? fare,
    double? distance,
    int? duration,
    DateTime? searchStartTime,
    DateTime? rideStartTime,
    String? rideOTP,
    String? error,
  }) {
    return RideState(
      status: status ?? this.status,
      rideId: rideId ?? this.rideId,
      driverId: driverId ?? this.driverId,
      driverName: driverName ?? this.driverName,
      driverPhone: driverPhone ?? this.driverPhone,
      driverRating: driverRating ?? this.driverRating,
      driverAvatarUrl: driverAvatarUrl ?? this.driverAvatarUrl,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleColor: vehicleColor ?? this.vehicleColor,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      destinationAddress: destinationAddress ?? this.destinationAddress,
      rideType: rideType ?? this.rideType,
      fare: fare ?? this.fare,
      distance: distance ?? this.distance,
      duration: duration ?? this.duration,
      searchStartTime: searchStartTime ?? this.searchStartTime,
      rideStartTime: rideStartTime ?? this.rideStartTime,
      rideOTP: rideOTP ?? this.rideOTP,
      error: error ?? this.error,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status.index,
      'rideId': rideId,
      'driverId': driverId,
      'driverName': driverName,
      'driverPhone': driverPhone,
      'driverRating': driverRating,
      'driverAvatarUrl': driverAvatarUrl,
      'vehicleNumber': vehicleNumber,
      'vehicleType': vehicleType,
      'vehicleColor': vehicleColor,
      'pickupLocation': pickupLocation?.toJson(),
      'destinationLocation': destinationLocation?.toJson(),
      'pickupAddress': pickupAddress,
      'destinationAddress': destinationAddress,
      'rideType': rideType,
      'fare': fare,
      'distance': distance,
      'duration': duration,
      'searchStartTime': searchStartTime?.toIso8601String(),
      'rideStartTime': rideStartTime?.toIso8601String(),
      'rideOTP': rideOTP,
    };
  }

  factory RideState.fromJson(Map<String, dynamic> json) {
    return RideState(
      status: ActiveRideStatus.values[json['status'] as int? ?? 0],
      rideId: json['rideId'] as String?,
      driverId: json['driverId'] as String?,
      driverName: json['driverName'] as String?,
      driverPhone: json['driverPhone'] as String?,
      driverRating: json['driverRating'] as String?,
      driverAvatarUrl: json['driverAvatarUrl'] as String?,
      vehicleNumber: json['vehicleNumber'] as String?,
      vehicleType: json['vehicleType'] as String?,
      vehicleColor: json['vehicleColor'] as String?,
      pickupLocation: json['pickupLocation'] != null 
          ? LocationCoordinate.fromJson(json['pickupLocation'] as Map<String, dynamic>)
          : null,
      destinationLocation: json['destinationLocation'] != null 
          ? LocationCoordinate.fromJson(json['destinationLocation'] as Map<String, dynamic>)
          : null,
      pickupAddress: json['pickupAddress'] as String?,
      destinationAddress: json['destinationAddress'] as String?,
      rideType: json['rideType'] as String?,
      fare: (json['fare'] as num?)?.toDouble(),
      distance: (json['distance'] as num?)?.toDouble(),
      duration: json['duration'] as int?,
      searchStartTime: json['searchStartTime'] != null 
          ? DateTime.parse(json['searchStartTime'] as String)
          : null,
      rideStartTime: json['rideStartTime'] != null 
          ? DateTime.parse(json['rideStartTime'] as String)
          : null,
      rideOTP: json['rideOTP'] as String?,
    );
  }
}

class RideStateNotifier extends Notifier<RideState> {
  static const _storageKey = 'current_ride_state';
  late final FlutterSecureStorage _storage;

  @override
  RideState build() {
    _storage = const FlutterSecureStorage();
    _loadSavedState();
    return const RideState();
  }

  Future<void> _loadSavedState() async {
    try {
      final savedState = await _storage.read(key: _storageKey);
      if (savedState != null) {
        final json = jsonDecode(savedState) as Map<String, dynamic>;
        final loadedState = RideState.fromJson(json);
        
        // Only restore if the ride is still active
        if (loadedState.isActive && loadedState.rideId != null) {
          // Verify the ride still exists on backend
          try {
            final response = await apiClient.getRide(loadedState.rideId!);
            if (response['success'] == true && response['ride'] != null) {
              final ride = response['ride'] as Map<String, dynamic>;
              final status = ride['status'] as String?;
              
              // Only restore if ride is still active on backend
              if (status == 'requested' || status == 'accepted' || 
                  status == 'arriving' || status == 'in_progress') {
                state = loadedState;
                return;
              }
            }
          } catch (e) {
            // Ride doesn't exist or backend unavailable - clear local state
            print('Ride verification failed, clearing local state: $e');
          }
        }
        
        // Clear stale/completed rides
        await _storage.delete(key: _storageKey);
      }
    } catch (e) {
      // If there's an error loading, start fresh
      await _storage.delete(key: _storageKey);
    }
  }

  Future<void> _saveState() async {
    try {
      if (state.isActive) {
        await _storage.write(
          key: _storageKey,
          value: jsonEncode(state.toJson()),
        );
      } else {
        await _storage.delete(key: _storageKey);
      }
    } catch (e) {
      // Ignore save errors
    }
  }

  Timer? _pollingTimer;

  Future<void> startSearching({
    required LocationCoordinate pickupLocation,
    required LocationCoordinate destinationLocation,
    required String pickupAddress,
    required String destinationAddress,
    required String rideType,
    required double fare,
    required double distance,
    required int duration,
  }) async {
    state = RideState(
      status: ActiveRideStatus.searching,
      pickupLocation: pickupLocation,
      destinationLocation: destinationLocation,
      pickupAddress: pickupAddress,
      destinationAddress: destinationAddress,
      rideType: rideType,
      fare: fare,
      distance: distance,
      duration: duration,
      searchStartTime: DateTime.now(),
    );
    await _saveState();
    
    // Create ride request on backend
    try {
      final response = await apiClient.createRide({
        'pickupLocation': pickupLocation.toJson(),
        'destinationLocation': destinationLocation.toJson(),
        'pickupAddress': pickupAddress,
        'destinationAddress': destinationAddress,
        'rideType': rideType,
        'fare': fare,
        'distance': distance,
        'duration': duration,
      });
      
      print('🚗 Create ride response: $response');
      
      if (response['success'] == true && response['ride'] != null) {
        final ride = response['ride'] as Map<String, dynamic>;
        final rideId = ride['id'] as String?;
        print('🚗 Ride created with ID: $rideId');
        state = state.copyWith(rideId: rideId);
        await _saveState();
        
        // Start polling for ride status updates
        if (rideId != null) {
          _startPollingRideStatus(rideId);
        }
      } else {
        // Backend didn't return expected data, generate local ID for demo
        _createDemoRide();
      }
    } catch (e) {
      print('Failed to create ride request: $e');
      // Create demo ride for local testing
      _createDemoRide();
    }
  }
  
  void _createDemoRide() {
    final demoRideId = 'demo-${DateTime.now().millisecondsSinceEpoch}';
    print('🎭 Creating demo ride with ID: $demoRideId');
    state = state.copyWith(rideId: demoRideId);
    _saveState();
    
    // Simulate driver found after 3-5 seconds for demo
    Future.delayed(Duration(seconds: 3 + DateTime.now().second % 3), () async {
      if (state.status == ActiveRideStatus.searching) {
        await driverFound(
          driverId: 'demo-driver-1',
          driverName: 'Demo Driver',
          driverPhone: '+919876543210',
          driverRating: '4.8',
          vehicleNumber: 'KA 01 AB 1234',
          vehicleType: 'Sedan',
          vehicleColor: 'White',
          rideOTP: _generateOTP(),
        );
        print('🎭 Demo driver found!');
      }
    });
  }
  
  void _startPollingRideStatus(String rideId) {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (state.status != ActiveRideStatus.searching) {
        timer.cancel();
        return;
      }
      
      try {
        final response = await apiClient.getRide(rideId);
        if (response['success'] == true && response['ride'] != null) {
          final ride = response['ride'] as Map<String, dynamic>;
          final status = ride['status'] as String?;
          
          if (status == 'accepted') {
            timer.cancel();
            await driverFound(
              driverId: ride['driverId'] as String? ?? '',
              driverName: ride['driverName'] as String? ?? 'Driver',
              driverPhone: ride['driverPhone'] as String?,
              driverRating: ride['driverRating']?.toString(),
              driverAvatarUrl: ride['driverAvatarUrl'] as String?,
              vehicleNumber: ride['vehicleNumber'] as String?,
              vehicleType: ride['vehicleType'] as String? ?? ride['vehicleModel'] as String?,
              vehicleColor: ride['vehicleColor'] as String?,
              rideOTP: ride['otp'] as String?,
            );
          } else if (status == 'cancelled') {
            timer.cancel();
            await cancelRide();
          }
        }
      } catch (e) {
        print('Error polling ride status: $e');
      }
    });
  }
  
  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> driverFound({
    required String driverId,
    required String driverName,
    String? driverPhone,
    String? driverRating,
    String? driverAvatarUrl,
    String? vehicleNumber,
    String? vehicleType,
    String? vehicleColor,
    String? rideOTP,
  }) async {
    // Generate OTP if not provided
    final otp = rideOTP ?? _generateOTP();
    
    state = state.copyWith(
      status: ActiveRideStatus.driverFound,
      driverId: driverId,
      driverName: driverName,
      driverPhone: driverPhone,
      driverRating: driverRating,
      driverAvatarUrl: driverAvatarUrl,
      vehicleNumber: vehicleNumber,
      vehicleType: vehicleType,
      vehicleColor: vehicleColor,
      rideOTP: otp,
    );
    await _saveState();
  }
  
  String _generateOTP() {
    // Generate a 4-digit OTP
    final random = DateTime.now().millisecondsSinceEpoch % 10000;
    return random.toString().padLeft(4, '0');
  }

  Future<void> driverArriving() async {
    state = state.copyWith(status: ActiveRideStatus.driverArriving);
    await _saveState();
  }

  Future<void> startRide(String rideId) async {
    state = state.copyWith(
      status: ActiveRideStatus.inProgress,
      rideId: rideId,
      rideStartTime: DateTime.now(),
    );
    await _saveState();
  }

  Future<void> completeRide() async {
    state = state.copyWith(status: ActiveRideStatus.completed);
    await _saveState();
  }

  Future<void> cancelRide() async {
    _stopPolling();
    
    // Cancel on backend if we have a ride ID
    if (state.rideId != null) {
      try {
        await apiClient.cancelRide(state.rideId!, reason: 'User cancelled');
      } catch (e) {
        print('Failed to cancel ride on backend: $e');
      }
    }
    
    state = const RideState(status: ActiveRideStatus.cancelled);
    await _storage.delete(key: _storageKey);
  }

  Future<void> clearRide() async {
    _stopPolling();
    state = const RideState();
    await _storage.delete(key: _storageKey);
  }

  void setError(String error) {
    state = state.copyWith(error: error);
  }
}

final rideStateProvider = NotifierProvider<RideStateNotifier, RideState>(() {
  return RideStateNotifier();
});

