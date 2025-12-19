import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/ride/providers/ride_state_provider.dart';
import '../../features/ride/presentation/widgets/ride_status_banner.dart';
import '../router/app_routes.dart';

/// A scaffold wrapper that shows a ride status banner at the top when there's an active ride.
/// Use this instead of Scaffold for screens that should show the ongoing ride status.
class RideAwareScaffold extends ConsumerWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final Color? backgroundColor;
  final bool extendBodyBehindAppBar;
  final bool showMiniBanner;

  const RideAwareScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.drawer,
    this.backgroundColor,
    this.extendBodyBehindAppBar = false,
    this.showMiniBanner = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideState = ref.watch(rideStateProvider);

    return Scaffold(
      backgroundColor: backgroundColor,
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      appBar: appBar,
      drawer: drawer,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      body: Column(
        children: [
          // Show mini banner if there's an active ride
          if (showMiniBanner && rideState.isActive)
            RideStatusMiniBanner(
              onTap: () => _handleBannerTap(context, ref, rideState),
            ),
          
          // Main body
          Expanded(child: body),
        ],
      ),
    );
  }

  void _handleBannerTap(BuildContext context, WidgetRef ref, RideState rideState) {
    if (rideState.isSearching) {
      // Go back to home to see the searching sheet
      context.go(AppRoutes.home);
    } else if (rideState.status == ActiveRideStatus.inProgress && rideState.rideId != null) {
      // Go to ride tracking
      context.push(AppRoutes.rideTrackingPath(rideState.rideId!));
    } else {
      // Default: go to home
      context.go(AppRoutes.home);
    }
  }
}

