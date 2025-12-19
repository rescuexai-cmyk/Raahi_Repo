import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/models/driver.dart';
import '../../../../core/models/location.dart';
import '../../../../core/services/maps_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/config/app_config.dart';

class CustomMapView extends StatefulWidget {
  final List<Driver> drivers;
  final LocationCoordinate? pickupLocation;
  final LocationCoordinate? dropoffLocation;
  final LocationCoordinate? currentUserLocation;
  final String userType;
  final bool showUserLocation;
  final bool followUserLocation;
  final bool showTraffic;
  final int searchRadius;
  final Function(Driver)? onDriverPress;
  final Function(LatLng)? onLocationPress;
  final Function(CameraPosition)? onRegionChange;
  final bool rideInProgress;
  final LocationCoordinate? driverLocation;

  const CustomMapView({
    super.key,
    this.drivers = const [],
    this.pickupLocation,
    this.dropoffLocation,
    this.currentUserLocation,
    this.userType = 'rider',
    this.showUserLocation = true,
    this.followUserLocation = false,
    this.showTraffic = true,
    this.searchRadius = 5000,
    this.onDriverPress,
    this.onLocationPress,
    this.onRegionChange,
    this.rideInProgress = false,
    this.driverLocation,
  });

  @override
  State<CustomMapView> createState() => _CustomMapViewState();
}

class _CustomMapViewState extends State<CustomMapView> {
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  Set<Circle> _circles = {};
  LocationCoordinate? _userLocation;
  bool _isMapReady = false;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void didUpdateWidget(CustomMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pickupLocation != oldWidget.pickupLocation ||
        widget.dropoffLocation != oldWidget.dropoffLocation) {
      _calculateRoute();
    }
    if (widget.drivers != oldWidget.drivers ||
        widget.pickupLocation != oldWidget.pickupLocation ||
        widget.dropoffLocation != oldWidget.dropoffLocation) {
      _updateMarkers();
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _userLocation = LocationCoordinate(
          lat: position.latitude,
          lng: position.longitude,
        );
      });

      if (_isMapReady && _mapController != null) {
        _animateToLocation(_userLocation!);
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _animateToLocation(LocationCoordinate location, {double zoom = 15}) {
    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: LatLng(location.lat, location.lng),
          zoom: zoom,
        ),
      ),
    );
  }

  Future<void> _calculateRoute() async {
    if (widget.pickupLocation == null || widget.dropoffLocation == null) {
      setState(() => _polylines = {});
      return;
    }

    try {
      final directions = await mapsService.getDirections(
        widget.pickupLocation!,
        widget.dropoffLocation!,
      );

      if (directions != null) {
        final coordinates = mapsService.decodePolyline(directions.polyline);
        final polylineCoords = coordinates.map((c) => LatLng(c.lat, c.lng)).toList();

        setState(() {
          _polylines = {
            Polyline(
              polylineId: const PolylineId('route'),
              points: polylineCoords,
              color: AppColors.routeColor,
              width: 4,
            ),
          };
        });

        // Fit map to show entire route
        if (_mapController != null && polylineCoords.isNotEmpty) {
          final bounds = _getBoundsFromPoints(polylineCoords);
          _mapController!.animateCamera(
            CameraUpdate.newLatLngBounds(bounds, 100),
          );
        }
      }
    } catch (e) {
      debugPrint('Error calculating route: $e');
    }
  }

  LatLngBounds _getBoundsFromPoints(List<LatLng> points) {
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final point in points) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  void _updateMarkers() {
    final markers = <Marker>{};

    // Driver markers
    for (final driver in widget.drivers) {
      if (driver.currentLocation != null) {
        markers.add(
          Marker(
            markerId: MarkerId('driver_${driver.id}'),
            position: LatLng(driver.currentLocation!.lat, driver.currentLocation!.lng),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
            infoWindow: InfoWindow(
              title: driver.name,
              snippet: '${driver.vehicleInfo?.type ?? 'Vehicle'} • ${driver.rating}⭐',
            ),
            onTap: () => widget.onDriverPress?.call(driver),
          ),
        );
      }
    }

    // Pickup marker
    if (widget.pickupLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(widget.pickupLocation!.lat, widget.pickupLocation!.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: const InfoWindow(title: 'Pickup Location'),
        ),
      );
    }

    // Dropoff marker
    if (widget.dropoffLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('dropoff'),
          position: LatLng(widget.dropoffLocation!.lat, widget.dropoffLocation!.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'Dropoff Location'),
        ),
      );
    }

    // Active driver during ride
    if (widget.rideInProgress && widget.driverLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('active_driver'),
          position: LatLng(widget.driverLocation!.lat, widget.driverLocation!.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Your Driver'),
        ),
      );
    }

    // Search radius circle
    final circles = <Circle>{};
    if (_userLocation != null && widget.userType == 'rider' && !widget.rideInProgress) {
      circles.add(
        Circle(
          circleId: const CircleId('search_radius'),
          center: LatLng(_userLocation!.lat, _userLocation!.lng),
          radius: widget.searchRadius.toDouble(),
          strokeColor: AppColors.secondary.withOpacity(0.3),
          fillColor: AppColors.secondary.withOpacity(0.1),
          strokeWidth: 1,
        ),
      );
    }

    setState(() {
      _markers = markers;
      _circles = circles;
    });
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    setState(() => _isMapReady = true);

    if (_userLocation != null) {
      _animateToLocation(_userLocation!);
    }
    _updateMarkers();
    _calculateRoute();
  }

  void _onMapTap(LatLng position) {
    widget.onLocationPress?.call(position);
  }

  @override
  Widget build(BuildContext context) {
    final initialPosition = widget.currentUserLocation ?? _userLocation;
    
    // Check if API key is configured (will show placeholder if not)
    if (!AppConfig.isMapsConfigured) {
      return _buildMapPlaceholder(context);
    }
    
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: initialPosition != null
            ? LatLng(initialPosition.lat, initialPosition.lng)
            : LatLng(AppConfig.defaultLatitude, AppConfig.defaultLongitude),
        zoom: AppConfig.defaultZoom,
      ),
      onMapCreated: _onMapCreated,
      onTap: _onMapTap,
      onCameraMove: (position) => widget.onRegionChange?.call(position),
      markers: _markers,
      polylines: _polylines,
      circles: _circles,
      myLocationEnabled: widget.showUserLocation,
      myLocationButtonEnabled: false,
      compassEnabled: true,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      trafficEnabled: widget.showTraffic,
      buildingsEnabled: true,
      indoorViewEnabled: true,
    );
  }

  Widget _buildMapPlaceholder(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primary.withOpacity(0.1),
            AppColors.secondary.withOpacity(0.1),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Grid pattern to simulate map
          CustomPaint(
            painter: _MapGridPainter(),
            size: Size.infinite,
          ),
          // Demo markers
          if (_userLocation != null || widget.currentUserLocation != null)
            Positioned(
              top: MediaQuery.of(context).size.height * 0.35,
              left: MediaQuery.of(context).size.width * 0.45,
              child: const Icon(Icons.location_on, color: AppColors.primary, size: 40),
            ),
          // Driver markers simulation
          for (int i = 0; i < (widget.drivers.length.clamp(0, 5)); i++)
            Positioned(
              top: 150.0 + (i * 60),
              left: 80.0 + (i * 50),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                ),
                child: const Icon(Icons.directions_car, color: AppColors.success, size: 24),
              ),
            ),
          // Info banner
          Positioned(
            top: 100,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)],
              ),
              child: Column(
                children: [
                  const Icon(Icons.map, color: AppColors.secondary, size: 32),
                  const SizedBox(height: 8),
                  const Text(
                    'Demo Mode',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Map preview (API key not configured)',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}

// Custom painter for map grid placeholder
class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.border.withOpacity(0.3)
      ..strokeWidth = 0.5;

    // Draw horizontal lines
    for (double y = 0; y < size.height; y += 30) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Draw vertical lines
    for (double x = 0; x < size.width; x += 30) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    // Draw some "roads" - horizontal
    final roadPaint = Paint()
      ..color = Colors.grey.withOpacity(0.4)
      ..strokeWidth = 8;

    canvas.drawLine(
      Offset(0, size.height * 0.3),
      Offset(size.width, size.height * 0.3),
      roadPaint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.6),
      Offset(size.width, size.height * 0.6),
      roadPaint,
    );

    // Draw some "roads" - vertical
    canvas.drawLine(
      Offset(size.width * 0.25, 0),
      Offset(size.width * 0.25, size.height),
      roadPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.7, 0),
      Offset(size.width * 0.7, size.height),
      roadPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

