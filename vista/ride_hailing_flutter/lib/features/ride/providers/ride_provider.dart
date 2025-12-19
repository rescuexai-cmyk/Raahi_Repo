import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/ride.dart';
import '../../../core/models/location.dart';
import '../../../core/services/api_client.dart';
import '../../../core/services/websocket_service.dart';

// Active ride state
class ActiveRideState {
  final Ride? activeRide;
  final LocationCoordinate? driverLocation;
  final bool isLoading;
  final String? error;

  const ActiveRideState({
    this.activeRide,
    this.driverLocation,
    this.isLoading = false,
    this.error,
  });

  ActiveRideState copyWith({
    Ride? activeRide,
    LocationCoordinate? driverLocation,
    bool? isLoading,
    String? error,
  }) {
    return ActiveRideState(
      activeRide: activeRide ?? this.activeRide,
      driverLocation: driverLocation ?? this.driverLocation,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  bool get hasActiveRide => activeRide != null && 
      activeRide!.status != RideStatus.completed &&
      activeRide!.status != RideStatus.cancelled;
}

// Active ride notifier
class ActiveRideNotifier extends StateNotifier<ActiveRideState> {
  ActiveRideNotifier() : super(const ActiveRideState());

  VoidCallback? _unsubscribe;

  void setActiveRide(Ride ride) {
    state = state.copyWith(activeRide: ride);
    _subscribeToRideUpdates(ride.id);
  }

  void _subscribeToRideUpdates(String rideId) {
    _unsubscribe?.call();
    
    webSocketService.joinRideTracking(rideId);
    
    _unsubscribe = webSocketService.subscribeToRideUpdates(rideId, (data) {
      switch (data['type']) {
        case 'status_update':
          _handleStatusUpdate(data);
          break;
        case 'location_update':
          _handleLocationUpdate(data);
          break;
        case 'cancelled':
          _handleCancelled();
          break;
      }
    });
  }

  void _handleStatusUpdate(Map<String, dynamic> data) {
    if (state.activeRide == null) return;
    
    final statusStr = data['status'] as String;
    final status = _parseStatus(statusStr);
    
    state = state.copyWith(
      activeRide: state.activeRide!.copyWith(status: status),
    );
  }

  void _handleLocationUpdate(Map<String, dynamic> data) {
    final location = data['driverLocation'] as Map<String, dynamic>?;
    if (location != null) {
      state = state.copyWith(
        driverLocation: LocationCoordinate(
          lat: (location['latitude'] as num).toDouble(),
          lng: (location['longitude'] as num).toDouble(),
        ),
      );
    }
  }

  void _handleCancelled() {
    clearActiveRide();
  }

  void clearActiveRide() {
    if (state.activeRide != null) {
      webSocketService.leaveRideTracking(state.activeRide!.id);
    }
    _unsubscribe?.call();
    _unsubscribe = null;
    state = const ActiveRideState();
  }

  Future<void> cancelRide({String? reason}) async {
    if (state.activeRide == null) return;

    state = state.copyWith(isLoading: true);

    try {
      webSocketService.cancelRide(state.activeRide!.id, reason: reason);
      await apiClient.updateRideStatus(state.activeRide!.id, 'cancelled');
      clearActiveRide();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  RideStatus _parseStatus(String status) {
    switch (status) {
      case 'accepted':
        return RideStatus.accepted;
      case 'arriving':
      case 'driver_arriving':
        return RideStatus.driverArriving;
      case 'in_progress':
        return RideStatus.inProgress;
      case 'completed':
        return RideStatus.completed;
      case 'cancelled':
        return RideStatus.cancelled;
      default:
        return RideStatus.requested;
    }
  }

  @override
  void dispose() {
    _unsubscribe?.call();
    if (state.activeRide != null) {
      webSocketService.leaveRideTracking(state.activeRide!.id);
    }
    super.dispose();
  }
}

// Providers
final activeRideProvider = StateNotifierProvider<ActiveRideNotifier, ActiveRideState>((ref) {
  return ActiveRideNotifier();
});

final hasActiveRideProvider = Provider<bool>((ref) {
  return ref.watch(activeRideProvider).hasActiveRide;
});

final activeRideLocationProvider = Provider<LocationCoordinate?>((ref) {
  return ref.watch(activeRideProvider).driverLocation;
});

// Ride history provider
final rideHistoryProvider = FutureProvider.family<List<Ride>, String>((ref, userId) async {
  final ridesData = await apiClient.getUserRides(userId);
  return ridesData.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();
});

// Single ride provider
final rideDetailsProvider = FutureProvider.family<Ride, String>((ref, rideId) async {
  final rideData = await apiClient.getRide(rideId);
  return Ride.fromJson(rideData);
});
