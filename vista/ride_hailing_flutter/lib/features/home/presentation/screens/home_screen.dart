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
import '../../../ride/providers/ride_state_provider.dart';
import '../../../ride/presentation/widgets/ride_status_banner.dart';
import '../widgets/custom_map_view.dart';
import '../widgets/ride_booking_card.dart';
import '../widgets/ride_searching_sheet.dart';

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

    // Start searching using the global ride state provider
    await ref.read(rideStateProvider.notifier).startSearching(
      pickupLocation: _pickupLocation!,
      destinationLocation: _destinationLocation!,
      pickupAddress: _pickupAddress,
      destinationAddress: _destinationAddress,
      rideType: rideType,
      fare: fareEstimate.total,
      distance: fareEstimate.estimatedDistance,
      duration: fareEstimate.estimatedDuration.round(),
    );

    setState(() {
      _showBookingCard = false;
    });
  }

  void _cancelRideSearch() {
    ref.read(rideStateProvider.notifier).cancelRide();
    setState(() {
      _showBookingCard = true; // Show booking card again so user can rebook
    });
    _showSuccess('Ride request cancelled');
  }

  void _onDriverFound(String driverId) {
    // This will only be called when a real driver accepts from the backend
    _showSuccess('Driver found! Starting your trip...');
    
    // Navigate to ride tracking with the driver ID
    context.push(AppRoutes.rideTrackingPath(driverId));
  }
  
  void _onRideBannerTap() {
    final rideState = ref.read(rideStateProvider);
    debugPrint('🔔 Banner tapped! Status: ${rideState.status}, RideId: ${rideState.rideId}');
    
    if (rideState.isSearching) {
      // Already on home screen, just make sure booking card is hidden
      setState(() {
        _showBookingCard = false;
      });
    } else if (rideState.rideId != null && 
               (rideState.status == ActiveRideStatus.driverFound ||
                rideState.status == ActiveRideStatus.driverArriving ||
                rideState.status == ActiveRideStatus.inProgress)) {
      // Navigate to tracking screen for driver found, arriving, or in progress
      debugPrint('🔔 Navigating to tracking screen: ${AppRoutes.rideTrackingPath(rideState.rideId!)}');
      context.push(AppRoutes.rideTrackingPath(rideState.rideId!));
    } else {
      debugPrint('🔔 Cannot navigate: rideId=${rideState.rideId}, status=${rideState.status}');
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
    final rideState = ref.watch(rideStateProvider);
    final isSearching = rideState.isSearching;
    
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
          if (!isSearching)
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
              isVisible: _showBookingCard && !isSearching,
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
          
          // Ride searching sheet
          if (isSearching)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: RideSearchingSheet(
                pickupAddress: rideState.pickupAddress ?? _pickupAddress,
                destinationAddress: rideState.destinationAddress ?? _destinationAddress,
                pickupLocation: rideState.pickupLocation ?? _pickupLocation!,
                destinationLocation: rideState.destinationLocation ?? _destinationLocation!,
                rideType: rideState.rideType ?? 'economy',
                fareEstimate: FareEstimate(
                  rideType: rideState.rideType ?? 'economy',
                  baseFare: 0,
                  distanceFare: 0,
                  timeFare: 0,
                  subtotal: 0,
                  taxes: 0,
                  total: rideState.fare ?? 0,
                  currency: 'INR',
                  estimatedDistance: rideState.distance ?? 0,
                  estimatedDuration: (rideState.duration ?? 0).toDouble(),
                  distance: rideState.distance ?? 0,
                  estimatedTime: (rideState.duration ?? 0).toDouble(),
                ),
                onCancel: _cancelRideSearch,
                onDriverFound: _onDriverFound,
              ),
            ),
            
          // Show ride status banner when there's an active ride (not just searching on home)
          if (rideState.isActive && !isSearching)
            Positioned(
              top: MediaQuery.of(context).padding.top + 80,
              left: 0,
              right: 0,
              child: RideStatusBanner(
                onTap: _onRideBannerTap,
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
