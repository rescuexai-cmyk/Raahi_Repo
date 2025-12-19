import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/models/ride.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/providers/auth_provider.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  List<Ride> _rides = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRides();
  }

  Future<void> _loadRides() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final ridesData = await apiClient.getUserRides(user.id);
      final rides = ridesData.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();
      
      // Sort by date, newest first
      rides.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      
      setState(() => _rides = rides);
    } catch (e) {
      setState(() => _error = 'Failed to load ride history');
      debugPrint('Error loading rides: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Ride History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRides,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadRides, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (_rides.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: AppColors.textHint),
            const SizedBox(height: 16),
            Text(
              'No rides yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            Text(
              'Your ride history will appear here',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textHint),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRides,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _rides.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) => _RideCard(
          ride: _rides[index],
          onTap: () => context.push(AppRoutes.rideDetailsPath(_rides[index].id)),
        ),
      ),
    );
  }
}

class _RideCard extends StatelessWidget {
  final Ride ride;
  final VoidCallback onTap;

  const _RideCard({required this.ride, required this.onTap});

  Color get _statusColor {
    switch (ride.status) {
      case RideStatus.completed:
        return AppColors.success;
      case RideStatus.cancelled:
        return AppColors.error;
      case RideStatus.inProgress:
        return AppColors.secondary;
      default:
        return AppColors.warning;
    }
  }

  String get _statusText {
    switch (ride.status) {
      case RideStatus.completed:
        return 'Completed';
      case RideStatus.cancelled:
        return 'Cancelled';
      case RideStatus.inProgress:
        return 'In Progress';
      case RideStatus.requested:
        return 'Requested';
      case RideStatus.accepted:
        return 'Accepted';
      case RideStatus.arriving:
      case RideStatus.driverArriving:
        return 'Driver Arriving';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  dateFormat.format(ride.createdAt),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _statusText,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Locations
            Row(
              children: [
                Column(
                  children: [
                    Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.pickupMarker, shape: BoxShape.circle)),
                    Container(width: 2, height: 24, color: AppColors.border),
                    Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.dropoffMarker, shape: BoxShape.circle)),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ride.pickupLocation.address ?? 'Pickup',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        ride.destinationLocation.address ?? 'Destination',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Footer
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.directions_car, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      ride.rideType.toUpperCase(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 12),
                    Icon(Icons.straighten, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      '${ride.distance.toStringAsFixed(1)} km',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Text(
                  '₹${ride.fare.round()}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),

            // Rating (if completed)
            if (ride.status == RideStatus.completed && ride.rating != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  ...List.generate(5, (index) => Icon(
                    index < ride.rating!.round() ? Icons.star : Icons.star_border,
                    size: 16,
                    color: AppColors.starYellow,
                  )),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}






