import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/models/driver.dart';
import '../../../../core/models/location.dart';
import '../../../../core/models/ride.dart';
import '../../../../core/services/maps_service.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/providers/auth_provider.dart';
import '../widgets/custom_map_view.dart';
import '../widgets/ride_booking_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  LocationCoordinate? _currentLocation;
  LocationCoordinate? _pickupLocation;
  LocationCoordinate? _destinationLocation;
  String _pickupAddress = '';
  String _destinationAddress = '';
  
  List<Driver> _nearbyDrivers = [];
  bool _showBookingCard = false;
  bool _isLoadingLocation = true;
  bool _isLoadingDrivers = false;
  Timer? _driverRefreshTimer;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _driverRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);

    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final newPermission = await Geolocator.requestPermission();
        if (newPermission == LocationPermission.denied || 
            newPermission == LocationPermission.deniedForever) {
          _showError('Location permission is required');
          setState(() => _isLoadingLocation = false);
          return;
        }
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final location = LocationCoordinate(lat: position.latitude, lng: position.longitude);
      
      setState(() {
        _currentLocation = location;
        _pickupLocation = location;
      });

      // Get address for current location
      final address = await mapsService.reverseGeocode(location.lat, location.lng);
      if (address != null) {
        setState(() => _pickupAddress = address);
      }

      // Load nearby drivers
      await _loadNearbyDrivers();
      
      // Start auto-refresh
      _startDriverRefresh();
    } catch (e) {
      _showError('Unable to get your location');
      debugPrint('Location error: $e');
    } finally {
      setState(() => _isLoadingLocation = false);
    }
  }

  void _startDriverRefresh() {
    _driverRefreshTimer?.cancel();
    _driverRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_currentLocation != null && !_isLoadingDrivers) {
        _loadNearbyDrivers();
      }
    });
  }

  Future<void> _loadNearbyDrivers() async {
    if (_currentLocation == null) return;

    setState(() => _isLoadingDrivers = true);

    try {
      final driversData = await apiClient.getNearbyDrivers(
        _currentLocation!.lat,
        _currentLocation!.lng,
        radius: 10000,
      );

      final drivers = driversData.map((d) => Driver.fromJson(d as Map<String, dynamic>)).toList();

      setState(() => _nearbyDrivers = drivers);
      debugPrint('Loaded ${drivers.length} nearby drivers');
    } catch (e) {
      debugPrint('Error loading drivers: $e');
    } finally {
      setState(() => _isLoadingDrivers = false);
    }
  }

  void _handlePickupSelect(LocationCoordinate location, String address) {
    setState(() {
      _pickupLocation = location;
      _pickupAddress = address;
    });
  }

  void _handleDestinationSelect(LocationCoordinate location, String address) {
    setState(() {
      _destinationLocation = location;
      _destinationAddress = address;
    });
  }

  Future<void> _handleRideBooking(String rideType, FareEstimate fareEstimate) async {
    final user = ref.read(currentUserProvider);
    if (user == null || _pickupLocation == null || _destinationLocation == null) {
      _showError('Please ensure pickup and destination are selected');
      return;
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('🚗 Confirm Your Ride'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('📍 Pickup: $_pickupAddress'),
            const SizedBox(height: 8),
            Text('📍 Destination: $_destinationAddress'),
            const SizedBox(height: 16),
            Text('🚙 Vehicle: $rideType'),
            Text('💰 Fare: ₹${fareEstimate.total.round()}'),
            Text('📏 Distance: ${fareEstimate.estimatedDistance.toStringAsFixed(1)}km'),
            Text('⏱️ Duration: ${fareEstimate.estimatedDuration.round()} min'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('🚗 Book Now'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _processRideBooking(rideType, fareEstimate);
    }
  }

  Future<void> _processRideBooking(String rideType, FareEstimate fareEstimate) async {
    try {
      final user = ref.read(currentUserProvider);
      
      // Show searching dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Finding the best driver...'),
            ],
          ),
        ),
      );

      final result = await apiClient.createRideRequest({
        'userId': user?.id,
        'pickupLocation': _pickupLocation!.toJson(),
        'destinationLocation': _destinationLocation!.toJson(),
        'pickupAddress': _pickupAddress,
        'destinationAddress': _destinationAddress,
        'rideType': rideType,
        'fare': fareEstimate.total.round(),
        'distance': fareEstimate.estimatedDistance,
        'duration': fareEstimate.estimatedDuration.round(),
      });

      if (mounted) Navigator.pop(context); // Close searching dialog

      if (result['success'] == true) {
        final requestId = result['requestId'] as String?;
        if (requestId != null) {
          _showSuccess('Driver found! Navigating to tracking...');
          context.push(AppRoutes.rideTrackingPath(requestId));
        }
      } else {
        _showError(result['message'] as String? ?? 'No drivers available');
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      _showError('Unable to book ride. Please try again.');
      debugPrint('Booking error: $e');
    }
  }

  void _handleDriverPress(Driver driver) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Text(driver.name),
            if (driver.isVerified) ...[
              const SizedBox(width: 8),
              const Icon(Icons.verified, color: AppColors.primary, size: 20),
            ],
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (driver.vehicleInfo != null) ...[
              Text('${driver.vehicleInfo!.type} • ${driver.vehicleInfo!.color}'),
              Text(driver.vehicleInfo!.plateNumber),
              const SizedBox(height: 12),
            ],
            Text('Rating: ${driver.rating.toStringAsFixed(1)}⭐'),
            Text('Total Rides: ${driver.totalRides}'),
            Text('Status: ${driver.status.name}'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _showBookingCard = true);
            },
            child: const Text('Book Ride'),
          ),
        ],
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.success),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          CustomMapView(
            drivers: _nearbyDrivers,
            pickupLocation: _pickupLocation,
            dropoffLocation: _destinationLocation,
            currentUserLocation: _currentLocation,
            userType: 'rider',
            showUserLocation: true,
            showTraffic: true,
            searchRadius: 5000,
            onDriverPress: _handleDriverPress,
            onLocationPress: (latLng) {
              if (_pickupLocation == null) {
                _handlePickupSelect(
                  LocationCoordinate(lat: latLng.latitude, lng: latLng.longitude),
                  'Selected location',
                );
              } else if (_destinationLocation == null) {
                _handleDestinationSelect(
                  LocationCoordinate(lat: latLng.latitude, lng: latLng.longitude),
                  'Selected location',
                );
              }
            },
          ),

          // Top controls
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildCircleButton(Icons.menu, () {
                    Scaffold.of(context).openDrawer();
                  }),
                  _buildCircleButton(Icons.person, () {
                    context.go(AppRoutes.profile);
                  }),
                ],
              ),
            ),
          ),

          // Search button
          if (!_showBookingCard)
            Positioned(
              top: 120,
              left: 20,
              right: 20,
              child: GestureDetector(
                onTap: () => setState(() => _showBookingCard = true),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: AppColors.textSecondary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _isLoadingLocation ? 'Getting location...' : _isLoadingDrivers ? 'Loading drivers...' : 'Where to?',
                          style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                    ],
                  ),
                ),
              ),
            ),

          // Bottom action buttons
          Positioned(
            bottom: _showBookingCard ? MediaQuery.of(context).size.height * 0.4 : 100,
            right: 20,
            child: Column(
              children: [
                _buildCircleButton(
                  _isLoadingDrivers ? Icons.refresh : Icons.directions_car,
                  _loadNearbyDrivers,
                  isLoading: _isLoadingDrivers,
                ),
                const SizedBox(height: 12),
                _buildCircleButton(Icons.my_location, _getCurrentLocation, isLoading: _isLoadingLocation),
              ],
            ),
          ),

          // Booking card
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: RideBookingCard(
              isVisible: _showBookingCard,
              onClose: () => setState(() => _showBookingCard = false),
              onPickupSelect: _handlePickupSelect,
              onDestinationSelect: _handleDestinationSelect,
              onRideBooking: _handleRideBooking,
              pickupLocation: _pickupLocation,
              destinationLocation: _destinationLocation,
              pickupAddress: _pickupAddress,
              destinationAddress: _destinationAddress,
              currentLocation: _currentLocation,
              availableDrivers: _nearbyDrivers,
              isLoadingDrivers: _isLoadingDrivers,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircleButton(IconData icon, VoidCallback onTap, {bool isLoading = false}) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: isLoading
            ? const Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(icon, color: AppColors.secondary),
      ),
    );
  }
}
