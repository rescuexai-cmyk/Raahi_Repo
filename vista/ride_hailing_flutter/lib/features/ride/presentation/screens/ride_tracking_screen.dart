import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/models/driver.dart';
import '../../../../core/models/location.dart';
import '../../../../core/models/ride.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/services/websocket_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../../home/presentation/widgets/custom_map_view.dart';

class RideTrackingScreen extends ConsumerStatefulWidget {
  final String rideId;

  const RideTrackingScreen({super.key, required this.rideId});

  @override
  ConsumerState<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends ConsumerState<RideTrackingScreen> {
  Ride? _ride;
  Driver? _driver;
  LocationCoordinate? _driverLocation;
  bool _isLoading = true;
  bool _isSubmittingRating = false;
  String _statusMessage = 'Finding your driver...';
  VoidCallback? _unsubscribeRide;

  @override
  void initState() {
    super.initState();
    _loadRideDetails();
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _unsubscribeRide?.call();
    webSocketService.leaveRideTracking(widget.rideId);
    super.dispose();
  }

  Future<void> _loadRideDetails() async {
    try {
      final rideData = await apiClient.getRide(widget.rideId);
      final ride = Ride.fromJson(rideData);
      
      setState(() {
        _ride = ride;
        _driver = ride.driver;
        _isLoading = false;
        _statusMessage = _getStatusMessage(ride.status);
      });

      // Join WebSocket room for this ride
      webSocketService.joinRideTracking(widget.rideId);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusMessage = 'Error loading ride details';
      });
      debugPrint('Error loading ride: $e');
    }
  }

  void _subscribeToUpdates() {
    _unsubscribeRide = webSocketService.subscribeToRideUpdates(
      widget.rideId,
      (data) {
        switch (data['type']) {
          case 'status_update':
            _handleStatusUpdate(data);
            break;
          case 'location_update':
            _handleLocationUpdate(data);
            break;
          case 'cancelled':
            _handleRideCancelled(data);
            break;
        }
      },
    );
  }

  void _handleStatusUpdate(Map<String, dynamic> data) {
    final statusStr = data['status'] as String?;
    if (statusStr != null && _ride != null) {
      final status = _parseStatus(statusStr);
      setState(() {
        _ride = _ride!.copyWith(status: status);
        _statusMessage = _getStatusMessage(status);
      });

      // If ride completed, show completion dialog
      if (status == RideStatus.completed) {
        _showCompletionDialog();
      }
    }
  }

  void _handleLocationUpdate(Map<String, dynamic> data) {
    final location = data['driverLocation'] as Map<String, dynamic>?;
    if (location != null) {
      setState(() {
        _driverLocation = LocationCoordinate(
          lat: (location['latitude'] as num).toDouble(),
          lng: (location['longitude'] as num).toDouble(),
        );
      });
    }
  }

  void _handleRideCancelled(Map<String, dynamic> data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Ride Cancelled'),
        content: Text(data['reason'] as String? ?? 'Your ride has been cancelled.'),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go(AppRoutes.home);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('🎉 Ride Completed!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Thank you for riding with us!'),
            const SizedBox(height: 16),
            if (_ride != null)
              Text(
                '₹${_ride!.fare.round()}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            const SizedBox(height: 16),
            const Text('Rate your ride:'),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) => IconButton(
                icon: const Icon(Icons.star_border, size: 32),
                color: AppColors.starYellow,
                onPressed: () => _handleRatingTap(index + 1),
              )),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.go(AppRoutes.home);
            },
            child: const Text('Skip'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleRatingTap(int rating) async {
    Navigator.pop(context);
    await _submitRating(rating.toDouble());
    if (mounted) {
      context.go(AppRoutes.home);
    }
  }

  Future<void> _submitRating(double rating) async {
    if (_ride == null || _isSubmittingRating) return;

    setState(() => _isSubmittingRating = true);
    try {
      await apiClient.submitRideRating(_ride!.id, rating);
      setState(() {
        _ride = _ride!.copyWith(rating: rating);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thanks for your feedback!'), backgroundColor: AppColors.success),
      );
    } catch (e) {
      debugPrint('Error submitting rating: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to submit rating'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmittingRating = false);
      }
    }
  }

  Future<void> _callDriver() async {
    final phone = _driver?.phone ?? _ride?.driver?.phone;
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver phone number unavailable')),
      );
      return;
    }

    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch dialer'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _messageDriver() async {
    final phone = _driver?.phone ?? _ride?.driver?.phone;
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver phone number unavailable')),
      );
      return;
    }

    final uri = Uri(scheme: 'sms', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open messages app'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _cancelRide() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Ride'),
        content: const Text('Are you sure you want to cancel this ride?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        webSocketService.cancelRide(widget.rideId, reason: 'Cancelled by rider');
        await apiClient.updateRideStatus(widget.rideId, 'cancelled');
        if (mounted) {
          context.go(AppRoutes.home);
        }
      } catch (e) {
        debugPrint('Error cancelling ride: $e');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to cancel ride'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  String _getStatusMessage(RideStatus status) {
    switch (status) {
      case RideStatus.requested:
        return 'Finding your driver...';
      case RideStatus.accepted:
        return 'Driver is on the way!';
      case RideStatus.arriving:
      case RideStatus.driverArriving:
        return 'Driver is arriving...';
      case RideStatus.inProgress:
        return 'Enjoy your ride!';
      case RideStatus.completed:
        return 'Ride completed';
      case RideStatus.cancelled:
        return 'Ride cancelled';
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
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          if (_ride != null)
            CustomMapView(
              pickupLocation: _ride!.pickupLocation.toLocationCoordinate(),
              dropoffLocation: _ride!.destinationLocation.toLocationCoordinate(),
              rideInProgress: true,
              driverLocation: _driverLocation,
            )
          else
            Container(color: AppColors.inputBackground),

          // Back button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: GestureDetector(
                onTap: () => context.pop(),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                  ),
                  child: const Icon(Icons.arrow_back),
                ),
              ),
            ),
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
              child: _isLoading ? _buildLoadingState() : _buildRideInfo(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircularProgressIndicator(),
        SizedBox(height: 16),
        Text('Loading ride details...'),
      ],
    );
  }

  Widget _buildRideInfo() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.directions_car, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _statusMessage,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  if (_ride != null)
                    Text(
                      'ETA: ${_ride!.estimatedDuration} min',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                    ),
                ],
              ),
            ),
          ],
        ),

        // Driver info
        if (_driver != null) ...[
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.secondary.withOpacity(0.2),
                child: Text(_driver!.name[0], style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(_driver!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        if (_driver!.isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 16, color: AppColors.primary),
                        ],
                      ],
                    ),
                    if (_driver!.vehicleInfo != null)
                      Text(
                        '${_driver!.vehicleInfo!.color} ${_driver!.vehicleInfo!.type}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                      ),
                  ],
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.star, size: 16, color: AppColors.starYellow),
                  Text(' ${_driver!.rating.toStringAsFixed(1)}'),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_driver!.vehicleInfo != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _driver!.vehicleInfo!.plateNumber,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
        ],

        const SizedBox(height: 20),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _callDriver,
                icon: const Icon(Icons.phone),
                label: const Text('Call'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _messageDriver,
                icon: const Icon(Icons.message),
                label: const Text('Message'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: TextButton(
            onPressed: _cancelRide,
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Cancel Ride'),
          ),
        ),
      ],
    );
  }
}






