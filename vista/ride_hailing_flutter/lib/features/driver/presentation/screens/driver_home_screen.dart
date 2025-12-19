import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/driver.dart';
import '../../../../core/models/location.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/services/websocket_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../home/presentation/widgets/custom_map_view.dart';

class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  LocationCoordinate? _currentLocation;
  bool _isOnline = false;
  bool _isLoadingLocation = true;
  Map<String, dynamic>? _currentRideRequest;
  Timer? _locationUpdateTimer;
  VoidCallback? _unsubscribeDriver;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _subscribeToDriverEvents();
  }

  @override
  void dispose() {
    _locationUpdateTimer?.cancel();
    _unsubscribeDriver?.call();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);

    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentLocation = LocationCoordinate(
          lat: position.latitude,
          lng: position.longitude,
        );
      });
    } catch (e) {
      debugPrint('Error getting location: $e');
    } finally {
      setState(() => _isLoadingLocation = false);
    }
  }

  void _subscribeToDriverEvents() {
    _unsubscribeDriver = webSocketService.subscribeToDriverEvents((data) {
      if (data['type'] == 'new_ride_request') {
        _handleNewRideRequest(data);
      } else if (data['type'] == 'ride_cancelled') {
        _handleRideCancelled();
      }
    });
  }

  void _handleNewRideRequest(Map<String, dynamic> data) {
    if (!_isOnline) return;

    setState(() => _currentRideRequest = data);
    
    // Auto-dismiss after 30 seconds
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted && _currentRideRequest == data) {
        setState(() => _currentRideRequest = null);
      }
    });
  }

  void _handleRideCancelled() {
    setState(() => _currentRideRequest = null);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Ride was cancelled by rider')),
    );
  }

  Future<void> _toggleOnlineStatus() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final newStatus = !_isOnline;

    try {
      await apiClient.updateDriverStatus(user.id, newStatus ? 'available' : 'offline');
      webSocketService.updateDriverAvailability(newStatus);

      setState(() => _isOnline = newStatus);

      if (newStatus) {
        _startLocationUpdates();
      } else {
        _stopLocationUpdates();
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newStatus ? "You're now online" : "You're now offline"),
          backgroundColor: newStatus ? AppColors.success : AppColors.textSecondary,
        ),
      );
    } catch (e) {
      debugPrint('Error updating status: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update status'), backgroundColor: AppColors.error),
      );
    }
  }

  void _startLocationUpdates() {
    _locationUpdateTimer?.cancel();
    _locationUpdateTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      final user = ref.read(currentUserProvider);
      if (user == null || !_isOnline) return;

      try {
        final position = await Geolocator.getCurrentPosition();
        
        setState(() {
          _currentLocation = LocationCoordinate(
            lat: position.latitude,
            lng: position.longitude,
          );
        });

        await apiClient.updateDriverLocation(
          user.id,
          position.latitude,
          position.longitude,
          heading: position.heading,
        );
      } catch (e) {
        debugPrint('Error updating location: $e');
      }
    });
  }

  void _stopLocationUpdates() {
    _locationUpdateTimer?.cancel();
    _locationUpdateTimer = null;
  }

  Future<void> _acceptRide() async {
    if (_currentRideRequest == null) return;

    final user = ref.read(currentUserProvider);
    if (user == null) return;

    try {
      final requestId = _currentRideRequest!['requestId'] as String;
      await apiClient.acceptRideRequest(requestId, user.id);
      webSocketService.acceptRide(requestId);

      setState(() => _currentRideRequest = null);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ride accepted! Navigate to pickup'), backgroundColor: AppColors.success),
      );
    } catch (e) {
      debugPrint('Error accepting ride: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to accept ride'), backgroundColor: AppColors.error),
      );
    }
  }

  void _declineRide() {
    if (_currentRideRequest == null) return;

    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final requestId = _currentRideRequest!['requestId'] as String;
    apiClient.rejectRideRequest(requestId, user.id);

    setState(() => _currentRideRequest = null);
  }

  Future<void> _openDriverMenu() async {
    final user = ref.read(currentUserProvider);

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: const Text('Profile'),
                onTap: () {
                  Navigator.pop(context);
                  context.go(AppRoutes.profile);
                },
              ),
              ListTile(
                leading: const Icon(Icons.history),
                title: const Text('Ride History'),
                onTap: () {
                  Navigator.pop(context);
                  context.go(AppRoutes.history);
                },
              ),
              ListTile(
                leading: Icon(_isOnline ? Icons.toggle_on : Icons.toggle_off, color: AppColors.primary, size: 32),
                title: Text(_isOnline ? 'Go Offline' : 'Go Online'),
                onTap: () async {
                  Navigator.pop(context);
                  await _toggleOnlineStatus();
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout, color: AppColors.error),
                title: const Text('Sign out', style: TextStyle(color: AppColors.error)),
                onTap: () async {
                  Navigator.pop(context);
                  await ref.read(authStateProvider.notifier).signOut();
                  if (mounted) {
                    context.go(AppRoutes.login);
                  }
                },
              ),
              if (user != null && user.email != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    user.email!,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          CustomMapView(
            currentUserLocation: _currentLocation,
            userType: 'driver',
            showUserLocation: true,
            followUserLocation: _isOnline,
          ),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _openDriverMenu,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                      ),
                      child: const Icon(Icons.menu),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: _isOnline ? AppColors.success : Colors.grey,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _isOnline ? 'ONLINE' : 'OFFLINE',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Ride request card
          if (_currentRideRequest != null)
            Positioned(
              bottom: 150,
              left: 16,
              right: 16,
              child: _buildRideRequestCard(),
            ),

          // Bottom card
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Driver stats
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem(Icons.star, '4.8', 'Rating'),
                      _buildStatItem(Icons.directions_car, '156', 'Trips'),
                      _buildStatItem(Icons.access_time, '12h', 'Online'),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Go online button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _toggleOnlineStatus,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isOnline ? AppColors.error : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(
                        _isOnline ? 'GO OFFLINE' : 'GO ONLINE',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: AppColors.primary, size: 24),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }

  Widget _buildRideRequestCard() {
    final request = _currentRideRequest!;
    final pickupAddress = request['pickupAddress'] as String? ?? 'Pickup';
    final destinationAddress = request['destinationAddress'] as String? ?? 'Destination';
    final fare = request['fare'] as num? ?? 0;
    final distance = (request['distance'] as num?)?.toStringAsFixed(1) ?? '0';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('New Ride Request', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('₹${fare.round()}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Column(
                children: [
                  Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.pickupMarker, shape: BoxShape.circle)),
                  Container(width: 2, height: 20, color: AppColors.border),
                  Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.dropoffMarker, shape: BoxShape.circle)),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(pickupAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 12),
                    Text(destinationAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('$distance km • Est. fare ₹${fare.round()}', style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _declineRide,
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _acceptRide,
                  child: const Text('Accept'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}






