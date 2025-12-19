import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../providers/ride_state_provider.dart';
import 'ride_chat_screen.dart';

class RideTrackingScreen extends ConsumerStatefulWidget {
  final String rideId;

  const RideTrackingScreen({super.key, required this.rideId});

  @override
  ConsumerState<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends ConsumerState<RideTrackingScreen> 
    with SingleTickerProviderStateMixin {
  Ride? _ride;
  Driver? _driver;
  LocationCoordinate? _driverLocation;
  bool _isLoading = true;
  bool _isSubmittingRating = false;
  String _statusMessage = 'Finding your driver...';
  VoidCallback? _unsubscribeRide;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _loadRideDetails();
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _unsubscribeRide?.call();
    _pulseController.dispose();
    webSocketService.leaveRideTracking(widget.rideId);
    super.dispose();
  }

  Future<void> _loadRideDetails() async {
    // First, try to use ride state data (for demo/local state)
    final rideState = ref.read(rideStateProvider);
    
    try {
      final rideData = await apiClient.getRide(widget.rideId);
      final rideJson = rideData['ride'] as Map<String, dynamic>? ?? rideData;
      final ride = Ride.fromJson(rideJson);
      
      setState(() {
        _ride = ride;
        _driver = ride.driver;
        _isLoading = false;
        _statusMessage = _getStatusMessage(ride.status);
      });

      // Join WebSocket room for this ride
      webSocketService.joinRideTracking(widget.rideId);
    } catch (e) {
      debugPrint('Error loading ride from API: $e');
      
      // Fallback to local ride state data
      if (rideState.isActive) {
        setState(() {
          _isLoading = false;
          _statusMessage = _getStatusMessageFromRideState(rideState.status);
        });
        debugPrint('Using local ride state data');
      } else {
        setState(() {
          _isLoading = false;
          _statusMessage = 'Error loading ride details';
        });
      }
    }
  }
  
  String _getStatusMessageFromRideState(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return 'Finding your driver...';
      case ActiveRideStatus.driverFound:
        return 'Driver is on the way!';
      case ActiveRideStatus.driverArriving:
        return 'Driver is arriving...';
      case ActiveRideStatus.inProgress:
        return 'Enjoy your ride!';
      case ActiveRideStatus.completed:
        return 'Ride completed';
      case ActiveRideStatus.cancelled:
        return 'Ride cancelled';
      case ActiveRideStatus.idle:
        return 'No active ride';
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
          lat: (location['lat'] ?? location['latitude'] as num).toDouble(),
          lng: (location['lng'] ?? location['longitude'] as num).toDouble(),
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
              ref.read(rideStateProvider.notifier).clearRide();
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
              ref.read(rideStateProvider.notifier).clearRide();
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
      ref.read(rideStateProvider.notifier).clearRide();
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
    } finally {
      if (mounted) {
        setState(() => _isSubmittingRating = false);
      }
    }
  }

  Future<void> _callDriver() async {
    final rideState = ref.read(rideStateProvider);
    final phone = rideState.driverPhone ?? _driver?.phone ?? _ride?.driver?.phone;
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

  Future<void> _openChat() async {
    final rideState = ref.read(rideStateProvider);
    final driverName = rideState.driverName ?? _driver?.name ?? 'Driver';
    final driverAvatar = rideState.driverAvatarUrl;
    
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => RideChatScreen(
          rideId: widget.rideId,
          driverName: driverName,
          driverAvatarUrl: driverAvatar,
        ),
      ),
    );
    
    if (result == 'call') {
      _callDriver();
    }
  }

  Future<void> _cancelRide() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.warning),
            SizedBox(width: 8),
            Text('Cancel Ride?'),
          ],
        ),
        content: const Text('Are you sure you want to cancel this ride? Cancellation fees may apply.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep Ride'),
          ),
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
        await ref.read(rideStateProvider.notifier).cancelRide();
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
    final rideState = ref.watch(rideStateProvider);
    
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
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))],
              ),
              child: _isLoading 
                  ? _buildLoadingState() 
                  : _buildRideInfo(rideState),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading ride details...'),
        ],
      ),
    );
  }

  Widget _buildRideInfo(RideState rideState) {
    final driverName = rideState.driverName ?? _driver?.name ?? 'Driver';
    final vehicleNumber = rideState.vehicleNumber ?? _driver?.vehicleInfo?.plateNumber;
    final vehicleType = rideState.vehicleType ?? _driver?.vehicleInfo?.type ?? 'Car';
    final vehicleColor = rideState.vehicleColor ?? _driver?.vehicleInfo?.color;
    final driverRating = rideState.driverRating ?? _driver?.rating.toStringAsFixed(1);
    final rideOTP = rideState.rideOTP;
    
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status with animation
                Row(
                  children: [
                    ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _statusMessage,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    if (_ride != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.timer_outlined, size: 16, color: AppColors.secondary),
                            const SizedBox(width: 4),
                            Text(
                              '${_ride!.estimatedDuration} min',
                              style: const TextStyle(
                                color: AppColors.secondary,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                
                const SizedBox(height: 20),
                
                // OTP Card (prominent display)
                if (rideOTP != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primary.withOpacity(0.1), AppColors.secondary.withOpacity(0.1)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.security, color: AppColors.primary, size: 20),
                            const SizedBox(width: 8),
                            const Text(
                              'Share this OTP with driver to start ride',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: rideOTP.split('').map((digit) {
                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: 48,
                              height: 56,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.primary, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withOpacity(0.2),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  digit,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: rideOTP));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('OTP copied to clipboard'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 16),
                          label: const Text('Copy OTP'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                
                // Driver info card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Driver avatar
                          Stack(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundColor: AppColors.primary.withOpacity(0.2),
                                backgroundImage: rideState.driverAvatarUrl != null
                                    ? NetworkImage(rideState.driverAvatarUrl!)
                                    : null,
                                child: rideState.driverAvatarUrl == null
                                    ? Text(
                                        driverName[0].toUpperCase(),
                                        style: const TextStyle(
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      )
                                    : null,
                              ),
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.verified,
                                    color: AppColors.primary,
                                    size: 16,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          // Driver details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  driverName,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.star, size: 16, color: AppColors.starYellow),
                                    const SizedBox(width: 4),
                                    Text(
                                      driverRating ?? '4.8',
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                    const Text(' • ', style: TextStyle(color: AppColors.textHint)),
                                    Text(
                                      '500+ rides',
                                      style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                      
                      // Vehicle info
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Vehicle',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${vehicleColor ?? ''} $vehicleType'.trim(),
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.textPrimary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              vehicleNumber ?? 'KA 01 AB 1234',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: _buildActionButton(
                        icon: Icons.phone,
                        label: 'Call',
                        color: AppColors.success,
                        onTap: _callDriver,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildActionButton(
                        icon: Icons.chat_bubble_outline,
                        label: 'Chat',
                        color: AppColors.primary,
                        onTap: _openChat,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildActionButton(
                        icon: Icons.share_location,
                        label: 'Share',
                        color: AppColors.secondary,
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Share ride feature coming soon!')),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Cancel button
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: _cancelRide,
                    style: TextButton.styleFrom(foregroundColor: AppColors.error),
                    child: const Text('Cancel Ride'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
