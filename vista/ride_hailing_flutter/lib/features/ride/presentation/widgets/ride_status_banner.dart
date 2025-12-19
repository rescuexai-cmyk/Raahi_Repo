import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/ride_state_provider.dart';

class RideStatusBanner extends ConsumerStatefulWidget {
  final VoidCallback? onTap;
  
  const RideStatusBanner({super.key, this.onTap});

  @override
  ConsumerState<RideStatusBanner> createState() => _RideStatusBannerState();
}

class _RideStatusBannerState extends ConsumerState<RideStatusBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  Timer? _timer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startTimer(DateTime? startTime) {
    _timer?.cancel();
    if (startTime != null) {
      _elapsedSeconds = DateTime.now().difference(startTime).inSeconds;
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) {
          setState(() {
            _elapsedSeconds++;
          });
        }
      });
    }
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final rideState = ref.watch(rideStateProvider);
    
    if (!rideState.isActive) {
      _timer?.cancel();
      return const SizedBox.shrink();
    }

    // Start timer for searching state
    if (rideState.isSearching && _timer == null) {
      _startTimer(rideState.searchStartTime);
    }

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: _getGradientColors(rideState.status),
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: _getPrimaryColor(rideState.status).withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Animated icon
                  _buildStatusIcon(rideState.status),
                  const SizedBox(width: 16),
                  
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _getStatusTitle(rideState.status),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getStatusSubtitle(rideState),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  
                  // Timer/Info
                  if (rideState.isSearching) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.timer_outlined, size: 16, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            _formatTime(_elapsedSeconds),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    const Icon(
                      Icons.chevron_right,
                      color: Colors.white,
                      size: 24,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusIcon(ActiveRideStatus status) {
    IconData icon;
    switch (status) {
      case ActiveRideStatus.searching:
        icon = Icons.search;
        break;
      case ActiveRideStatus.driverFound:
        icon = Icons.person_pin;
        break;
      case ActiveRideStatus.driverArriving:
        icon = Icons.directions_car;
        break;
      case ActiveRideStatus.inProgress:
        icon = Icons.navigation;
        break;
      default:
        icon = Icons.local_taxi;
    }

    if (status == ActiveRideStatus.searching) {
      return AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _pulseAnimation.value,
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
          );
        },
      );
    }

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: Colors.white, size: 24),
    );
  }

  List<Color> _getGradientColors(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return [const Color(0xFF6366F1), const Color(0xFF8B5CF6)];
      case ActiveRideStatus.driverFound:
        return [const Color(0xFF10B981), const Color(0xFF059669)];
      case ActiveRideStatus.driverArriving:
        return [const Color(0xFFF59E0B), const Color(0xFFD97706)];
      case ActiveRideStatus.inProgress:
        return [const Color(0xFF3B82F6), const Color(0xFF2563EB)];
      default:
        return [AppColors.secondary, AppColors.primary];
    }
  }

  Color _getPrimaryColor(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return const Color(0xFF6366F1);
      case ActiveRideStatus.driverFound:
        return const Color(0xFF10B981);
      case ActiveRideStatus.driverArriving:
        return const Color(0xFFF59E0B);
      case ActiveRideStatus.inProgress:
        return const Color(0xFF3B82F6);
      default:
        return AppColors.secondary;
    }
  }

  String _getStatusTitle(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return '🔍 Searching for driver...';
      case ActiveRideStatus.driverFound:
        return '✅ Driver found!';
      case ActiveRideStatus.driverArriving:
        return '🚗 Driver is on the way';
      case ActiveRideStatus.inProgress:
        return '🚀 Ride in progress';
      default:
        return 'Ride Status';
    }
  }

  String _getStatusSubtitle(RideState rideState) {
    switch (rideState.status) {
      case ActiveRideStatus.searching:
        return 'To: ${rideState.destinationAddress ?? 'Destination'}';
      case ActiveRideStatus.driverFound:
        return '${rideState.driverName ?? 'Driver'} • ${rideState.vehicleNumber ?? 'Vehicle'}';
      case ActiveRideStatus.driverArriving:
        return 'Arriving at pickup point';
      case ActiveRideStatus.inProgress:
        return 'Heading to ${rideState.destinationAddress ?? 'destination'}';
      default:
        return '';
    }
  }
}

// Mini version for compact spaces
class RideStatusMiniBanner extends ConsumerWidget {
  final VoidCallback? onTap;
  
  const RideStatusMiniBanner({super.key, this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideState = ref.watch(rideStateProvider);
    
    if (!rideState.isActive) {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _getStatusColor(rideState.status),
          boxShadow: [
            BoxShadow(
              color: _getStatusColor(rideState.status).withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: SafeArea(
          bottom: false,
          child: Row(
            children: [
              Icon(
                _getStatusIcon(rideState.status),
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _getStatusText(rideState),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Text(
                'TAP TO VIEW',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: Colors.white70, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return const Color(0xFF6366F1);
      case ActiveRideStatus.driverFound:
        return const Color(0xFF10B981);
      case ActiveRideStatus.driverArriving:
        return const Color(0xFFF59E0B);
      case ActiveRideStatus.inProgress:
        return const Color(0xFF3B82F6);
      default:
        return AppColors.secondary;
    }
  }

  IconData _getStatusIcon(ActiveRideStatus status) {
    switch (status) {
      case ActiveRideStatus.searching:
        return Icons.search;
      case ActiveRideStatus.driverFound:
        return Icons.check_circle;
      case ActiveRideStatus.driverArriving:
        return Icons.directions_car;
      case ActiveRideStatus.inProgress:
        return Icons.navigation;
      default:
        return Icons.local_taxi;
    }
  }

  String _getStatusText(RideState state) {
    switch (state.status) {
      case ActiveRideStatus.searching:
        return 'Searching for driver to ${state.destinationAddress ?? "destination"}';
      case ActiveRideStatus.driverFound:
        return 'Driver ${state.driverName ?? ""} is assigned';
      case ActiveRideStatus.driverArriving:
        return 'Driver arriving at pickup';
      case ActiveRideStatus.inProgress:
        return 'On the way to ${state.destinationAddress ?? "destination"}';
      default:
        return 'Ride active';
    }
  }
}

