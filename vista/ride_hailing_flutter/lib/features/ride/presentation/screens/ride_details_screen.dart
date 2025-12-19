import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/models/ride.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/theme/app_colors.dart';

class RideDetailsScreen extends ConsumerStatefulWidget {
  final String rideId;

  const RideDetailsScreen({super.key, required this.rideId});

  @override
  ConsumerState<RideDetailsScreen> createState() => _RideDetailsScreenState();
}

class _RideDetailsScreenState extends ConsumerState<RideDetailsScreen> {
  Ride? _ride;
  bool _isLoading = true;
  String? _error;
  bool _isSubmittingRating = false;

  @override
  void initState() {
    super.initState();
    _loadRideDetails();
  }

  Future<void> _loadRideDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final rideData = await apiClient.getRide(widget.rideId);
      setState(() => _ride = Ride.fromJson(rideData));
    } catch (e) {
      setState(() => _error = 'Failed to load ride details');
      debugPrint('Error loading ride: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Ride Details'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null || _ride == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error ?? 'Ride not found'),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadRideDetails, child: const Text('Retry')),
          ],
        ),
      );
    }

    final ride = _ride!;
    final dateFormat = DateFormat('MMMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _getStatusColor(ride.status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(_getStatusIcon(ride.status), color: _getStatusColor(ride.status)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getStatusText(ride.status),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _getStatusColor(ride.status),
                        ),
                      ),
                      Text(
                        '${dateFormat.format(ride.createdAt)} at ${timeFormat.format(ride.createdAt)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Route info
          Text('Route', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _buildLocationRow(Icons.circle, AppColors.pickupMarker, 'Pickup', ride.pickupLocation.address ?? 'Unknown'),
          Container(margin: const EdgeInsets.only(left: 11), width: 2, height: 24, color: AppColors.border),
          _buildLocationRow(Icons.location_on, AppColors.dropoffMarker, 'Dropoff', ride.destinationLocation.address ?? 'Unknown'),
          const SizedBox(height: 24),

          // Trip details
          Text('Trip Details', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _buildDetailRow('Vehicle Type', ride.rideType.toUpperCase()),
          _buildDetailRow('Distance', '${ride.distance.toStringAsFixed(1)} km'),
          _buildDetailRow('Duration', '${ride.estimatedDuration} min'),
          _buildDetailRow('Payment', ride.paymentMethod.name.toUpperCase()),
          const SizedBox(height: 24),

          // Fare breakdown
          Text('Fare Details', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.inputBackground,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Fare'),
                    Text(
                      '₹${ride.fare.round()}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Driver info (if available)
          if (ride.driver != null) ...[
            Text('Driver', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.secondary.withOpacity(0.2),
                    child: Text(
                      ride.driver!.name[0].toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(ride.driver!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (ride.driver!.isVerified) ...[
                              const SizedBox(width: 4),
                              const Icon(Icons.verified, size: 16, color: AppColors.primary),
                            ],
                          ],
                        ),
                        if (ride.driver!.vehicleInfo != null)
                          Text(
                            '${ride.driver!.vehicleInfo!.color} ${ride.driver!.vehicleInfo!.type} • ${ride.driver!.vehicleInfo!.plateNumber}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                          ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 16, color: AppColors.starYellow),
                      const SizedBox(width: 4),
                      Text(ride.driver!.rating.toStringAsFixed(1)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Rating (for completed rides)
          if (ride.status == RideStatus.completed) ...[
            Text('Your Rating', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (ride.rating != null)
              Row(
                children: List.generate(5, (index) => Icon(
                  index < ride.rating!.round() ? Icons.star : Icons.star_border,
                  size: 32,
                  color: AppColors.starYellow,
                )),
              )
            else
              ElevatedButton(
                onPressed: _showRatingDialog,
                child: const Text('Rate this ride'),
              ),
          ],
          const SizedBox(height: 32),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openSupportOptions,
                  icon: const Icon(Icons.help_outline),
                  label: const Text('Get Help'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _downloadReceipt,
                  icon: const Icon(Icons.receipt_outlined),
                  label: const Text('Receipt'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow(IconData icon, Color color, String label, String address) {
    return Row(
      children: [
        Icon(icon, size: 22, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              Text(address, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Future<void> _showRatingDialog() async {
    if (_ride == null || _isSubmittingRating) return;

    double selectedRating = _ride!.rating ?? 5;
    String feedback = '';

    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Rate your ride'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final isFilled = index < selectedRating;
                  return IconButton(
                    icon: Icon(isFilled ? Icons.star : Icons.star_border, color: AppColors.starYellow),
                    onPressed: () {
                      setState(() => selectedRating = index + 1);
                    },
                  );
                }),
              ),
              TextField(
                onChanged: (value) => feedback = value,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Feedback (optional)',
                  hintText: 'Tell us about your trip',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await _submitRating(selectedRating, feedback: feedback.trim());
              },
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submitRating(double rating, {String? feedback}) async {
    if (_ride == null || _isSubmittingRating) return;

    setState(() => _isSubmittingRating = true);
    try {
      await apiClient.submitRideRating(_ride!.id, rating, feedback: feedback);
      setState(() {
        _ride = _ride!.copyWith(rating: rating);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rating submitted'), backgroundColor: AppColors.success),
      );
    } catch (e) {
      debugPrint('Error submitting rating: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to submit rating'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmittingRating = false);
      }
    }
  }

  Future<void> _openSupportOptions() async {
    const supportNumber = '+18001234567';
    const supportEmail = 'support@raahi.app';

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
                leading: const Icon(Icons.call),
                title: const Text('Call support'),
                subtitle: Text(supportNumber),
                onTap: () => _launchUri(Uri(scheme: 'tel', path: supportNumber)),
              ),
              ListTile(
                leading: const Icon(Icons.email_outlined),
                title: const Text('Email support'),
                subtitle: Text(supportEmail),
                onTap: () => _launchUri(Uri(
                  scheme: 'mailto',
                  path: supportEmail,
                  query: 'subject=Ride support&body=Ride ID: ${_ride?.id ?? ''}',
                )),
              ),
              if (_ride?.driver?.phone != null)
                ListTile(
                  leading: const Icon(Icons.chat_bubble_outline),
                  title: const Text('Message driver'),
                  subtitle: Text(_ride!.driver!.phone!),
                  onTap: () => _launchUri(Uri(scheme: 'sms', path: _ride!.driver!.phone!)),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _launchUri(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot open link'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _downloadReceipt() async {
    if (_ride == null) return;

    try {
      final receipt = await apiClient.getRideReceipt(_ride!.id);
      final receiptText = _formatReceipt(receipt);
      await Share.share(receiptText, subject: 'Ride receipt');
    } catch (e) {
      debugPrint('Error fetching receipt: $e');
      final fallback = _formatReceipt({
        'rideId': _ride!.id,
        'fare': _ride!.fare,
        'pickup': _ride!.pickupLocation.address,
        'dropoff': _ride!.destinationLocation.address,
        'created_at': _ride!.createdAt.toIso8601String(),
        'status': _ride!.status.name,
      });
      await Share.share(fallback, subject: 'Ride receipt');
    }
  }

  String _formatReceipt(Map<String, dynamic> receipt) {
    final buffer = StringBuffer();
    buffer.writeln('Ride Receipt');
    buffer.writeln('Ride ID: ${receipt['rideId'] ?? receipt['id'] ?? _ride?.id}');
    buffer.writeln('Status: ${receipt['status'] ?? _ride?.status.name}');
    buffer.writeln('Fare: ₹${receipt['fare'] ?? receipt['total'] ?? _ride?.fare}');
    if (receipt['pickup'] != null) buffer.writeln('Pickup: ${receipt['pickup']}');
    if (receipt['dropoff'] != null) buffer.writeln('Dropoff: ${receipt['dropoff']}');
    if (receipt['created_at'] != null) buffer.writeln('Date: ${receipt['created_at']}');
    if (receipt['payment_method'] != null) buffer.writeln('Payment: ${receipt['payment_method']}');
    if (receipt['driver'] != null) buffer.writeln('Driver: ${receipt['driver']}');
    return buffer.toString();
  }

  Color _getStatusColor(RideStatus status) {
    switch (status) {
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

  IconData _getStatusIcon(RideStatus status) {
    switch (status) {
      case RideStatus.completed:
        return Icons.check_circle;
      case RideStatus.cancelled:
        return Icons.cancel;
      case RideStatus.inProgress:
        return Icons.directions_car;
      default:
        return Icons.schedule;
    }
  }

  String _getStatusText(RideStatus status) {
    switch (status) {
      case RideStatus.completed:
        return 'Ride Completed';
      case RideStatus.cancelled:
        return 'Ride Cancelled';
      case RideStatus.inProgress:
        return 'Ride In Progress';
      case RideStatus.requested:
        return 'Ride Requested';
      case RideStatus.accepted:
        return 'Driver Accepted';
      case RideStatus.arriving:
      case RideStatus.driverArriving:
        return 'Driver Arriving';
    }
  }
}






