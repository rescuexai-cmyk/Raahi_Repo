import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/signup_screen.dart';
import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/history/presentation/screens/history_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/ride/presentation/screens/ride_details_screen.dart';
import '../../features/ride/presentation/screens/ride_tracking_screen.dart';
import '../../features/driver/presentation/screens/driver_home_screen.dart';
import '../widgets/main_scaffold.dart';
import 'app_routes.dart';

// Provider that only exposes whether the user is authenticated (to prevent unnecessary rebuilds)
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.user != null;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  // Only watch the authenticated status, not the entire auth state
  // This prevents rebuilds when just isLoading changes
  final isAuthenticated = ref.watch(isAuthenticatedProvider);
  
  return GoRouter(
    initialLocation: AppRoutes.login,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final currentLocation = state.matchedLocation;
      
      final isAuthRoute = currentLocation == AppRoutes.login ||
          currentLocation == AppRoutes.signup ||
          currentLocation.startsWith(AppRoutes.otpVerification);

      debugPrint('🔀 Router redirect: location=$currentLocation, isAuthenticated=$isAuthenticated, isAuthRoute=$isAuthRoute');

      // If not authenticated and trying to access protected routes, go to login
      if (!isAuthenticated && !isAuthRoute) {
        debugPrint('🔀 Redirecting to login (not authenticated)');
        return AppRoutes.login;
      }

      // If authenticated and on auth route, go to home
      if (isAuthenticated && isAuthRoute) {
        debugPrint('🔀 Redirecting to home (already authenticated)');
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.signup,
        name: 'signup',
        builder: (context, state) => const SignUpScreen(),
      ),
      GoRoute(
        path: AppRoutes.otpVerification,
        name: 'otpVerification',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          final isNewUser = state.uri.queryParameters['isNewUser'] == 'true';
          return OTPVerificationScreen(
            phone: phone,
            isNewUser: isNewUser,
          );
        },
      ),
      
      // Main app with bottom navigation
      ShellRoute(
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            name: 'home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: AppRoutes.history,
            name: 'history',
            builder: (context, state) => const HistoryScreen(),
          ),
          GoRoute(
            path: AppRoutes.profile,
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      
      // Ride details (outside bottom nav)
      GoRoute(
        path: AppRoutes.rideDetails,
        name: 'rideDetails',
        builder: (context, state) {
          final rideId = state.pathParameters['rideId'] ?? '';
          return RideDetailsScreen(rideId: rideId);
        },
      ),
      
      // Ride tracking
      GoRoute(
        path: AppRoutes.rideTracking,
        name: 'rideTracking',
        builder: (context, state) {
          final rideId = state.pathParameters['rideId'] ?? '';
          return RideTrackingScreen(rideId: rideId);
        },
      ),
      
      // Driver home
      GoRoute(
        path: AppRoutes.driverHome,
        name: 'driverHome',
        builder: (context, state) => const DriverHomeScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.matchedLocation,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.home),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});


