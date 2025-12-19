# RideApp Flutter

A ride-hailing mobile application migrated from React Native to Flutter. This app provides a complete ride-hailing experience for both riders and drivers.

## 📱 Features

### For Riders
- 🗺️ Real-time map with driver locations
- 📍 Address search with Google Places autocomplete
- 🚗 Multiple ride types (Bike, Economy, Comfort, Premium, XL)
- 💰 Real-time fare estimates
- 📊 Ride history
- 🔔 Real-time ride tracking
- ⭐ Driver ratings and reviews

### For Drivers
- 🟢 Online/Offline status toggle
- 📍 Real-time location updates
- 🔔 Ride request notifications
- ✅ Accept/Decline ride requests
- 📊 Driver statistics

## 🛠️ Tech Stack

- **Framework**: Flutter 3.x
- **State Management**: Riverpod
- **Navigation**: GoRouter
- **Maps**: Google Maps Flutter
- **Location**: Geolocator
- **HTTP Client**: Dio
- **WebSocket**: web_socket_channel
- **Local Storage**: flutter_secure_storage, shared_preferences

## 📦 Project Structure

```
lib/
├── main.dart
├── core/
│   ├── config/
│   │   └── app_config.dart
│   ├── models/
│   │   ├── user.dart
│   │   ├── driver.dart
│   │   ├── ride.dart
│   │   ├── location.dart
│   │   └── vehicle.dart
│   ├── router/
│   │   ├── app_router.dart
│   │   └── app_routes.dart
│   ├── services/
│   │   ├── api_client.dart
│   │   ├── maps_service.dart
│   │   └── websocket_service.dart
│   ├── theme/
│   │   ├── app_theme.dart
│   │   └── app_colors.dart
│   └── widgets/
│       └── main_scaffold.dart
└── features/
    ├── auth/
    │   ├── presentation/
    │   │   └── screens/
    │   │       ├── login_screen.dart
    │   │       ├── signup_screen.dart
    │   │       └── otp_verification_screen.dart
    │   └── providers/
    │       └── auth_provider.dart
    ├── home/
    │   └── presentation/
    │       ├── screens/
    │       │   └── home_screen.dart
    │       └── widgets/
    │           ├── custom_map_view.dart
    │           ├── ride_booking_card.dart
    │           └── address_search_input.dart
    ├── history/
    │   └── presentation/
    │       └── screens/
    │           └── history_screen.dart
    ├── profile/
    │   └── presentation/
    │       └── screens/
    │           └── profile_screen.dart
    ├── ride/
    │   └── presentation/
    │       └── screens/
    │           ├── ride_details_screen.dart
    │           └── ride_tracking_screen.dart
    └── driver/
        └── presentation/
            └── screens/
                └── driver_home_screen.dart
```

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK (3.0.0 or higher)
- Android Studio / Xcode
- Google Maps API Key

### Installation

1. **Clone the repository**
   ```bash
   cd vista/ride_hailing_flutter
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure environment variables**
   
   Create a `.env` file or pass build arguments:
   ```
   API_URL=http://your-api-url/api
   WS_URL=ws://your-websocket-url
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   RAZORPAY_KEY_ID=your-razorpay-key
   ```

4. **Configure Google Maps**
   
   **Android**: Add your API key in `android/app/src/main/AndroidManifest.xml`
   ```xml
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_API_KEY"/>
   ```
   
   **iOS**: Add your API key in `ios/Runner/AppDelegate.swift`
   ```swift
   GMSServices.provideAPIKey("YOUR_API_KEY")
   ```

5. **Run the app**
   ```bash
   # Debug mode
   flutter run
   
   # With environment variables
   flutter run --dart-define=API_URL=http://localhost:3000/api --dart-define=GOOGLE_MAPS_API_KEY=your-key
   ```

### Building for Production

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

## 🔄 Migration from React Native

This Flutter app is a complete migration of the original React Native (Expo) app with the following mappings:

| React Native | Flutter |
|--------------|---------|
| React Navigation | GoRouter |
| Context API | Riverpod |
| react-native-maps | google_maps_flutter |
| expo-location | geolocator |
| axios | dio |
| AsyncStorage | shared_preferences |
| Razorpay RN | razorpay_flutter |

### Key Differences

1. **State Management**: Replaced React Context with Riverpod for better performance and testability
2. **Navigation**: GoRouter provides type-safe routing with deep linking support
3. **Styling**: Uses Flutter's built-in styling with custom ThemeData
4. **Maps**: Native Google Maps integration with better performance

## 📄 API Compatibility

This Flutter app is fully compatible with the existing backend API. No backend changes are required.

## 🎨 UI/UX

The UI has been faithfully recreated to match the original React Native app:
- Same color scheme (Primary green: #22C55E, Secondary blue: #007AFF)
- Same component layouts and interactions
- Same navigation structure with bottom tabs
- Same map interactions and markers

## 📝 License

This project is licensed under the MIT License.






