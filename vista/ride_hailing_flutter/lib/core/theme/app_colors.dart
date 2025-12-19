import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary colors (matching React Native app)
  static const Color primary = Color(0xFF22C55E); // Green - main action color
  static const Color primaryLight = Color(0xFF4ADE80);
  static const Color primaryDark = Color(0xFF16A34A);
  
  // Secondary colors
  static const Color secondary = Color(0xFF007AFF); // Blue - accent color
  static const Color secondaryLight = Color(0xFF5AC8FA);
  static const Color secondaryDark = Color(0xFF0056B3);
  
  // Background colors
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color inputBackground = Color(0xFFF8F9FA);
  
  // Dark mode colors
  static const Color darkBackground = Color(0xFF121212);
  static const Color darkSurface = Color(0xFF1E1E1E);
  
  // Text colors
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF666666);
  static const Color textHint = Color(0xFF999999);
  static const Color textDisabled = Color(0xFFB0B0B0);
  
  // Status colors
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  
  // Border colors
  static const Color border = Color(0xFFE0E0E0);
  static const Color borderLight = Color(0xFFF0F0F0);
  
  // Map marker colors
  static const Color pickupMarker = Color(0xFF4CAF50);
  static const Color dropoffMarker = Color(0xFFF44336);
  static const Color driverMarker = Color(0xFF22C55E);
  static const Color userMarker = Color(0xFFFF6B6B);
  static const Color routeColor = Color(0xFF22C55E);
  
  // Ride type colors
  static const Color economyColor = Color(0xFF22C55E);
  static const Color comfortColor = Color(0xFF3B82F6);
  static const Color premiumColor = Color(0xFFF59E0B);
  static const Color xlColor = Color(0xFF8B5CF6);
  
  // Social button colors
  static const Color googleRed = Color(0xFFDB4437);
  static const Color facebookBlue = Color(0xFF4267B2);
  
  // Rating star color
  static const Color starYellow = Color(0xFFFFD700);
  
  // Gradient colors
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [secondary, secondaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}


