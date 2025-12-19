# Google Maps API Integration Setup

## Overview
The Raahi app now uses Google Maps API for real-time geocoding and location search. This provides accurate coordinates and better location suggestions.

## Setup Instructions

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Geocoding API**
   - **Places API**
   - **Maps JavaScript API**
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

### 2. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Google Maps API Configuration
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Backend API Configuration
VITE_API_URL=http://localhost:5001/api
VITE_WS_URL=ws://localhost:5001
```

### 3. Update HTML File
Replace `YOUR_GOOGLE_MAPS_API_KEY` in `index.html` with your actual API key:

```html
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places&callback=initGoogleMaps"></script>
```

## Features Implemented

### 🗺️ **Geocoding Service**
- **Address to Coordinates**: Convert addresses to lat/lng
- **Reverse Geocoding**: Convert coordinates to addresses
- **Current Location**: Get user's current location
- **Place Details**: Get detailed information about places

### 🔍 **Location Search**
- **Google Places Autocomplete**: Real-time location suggestions
- **Smart Filtering**: Filtered to India locations
- **Rich Suggestions**: Main text and secondary text display
- **Fallback Support**: Falls back to dummy data if API fails

### 📍 **Current Location**
- **GPS Integration**: Uses browser geolocation
- **Permission Handling**: Proper error handling for denied permissions
- **High Accuracy**: Configured for best location accuracy
- **Visual Feedback**: Loading indicators and success/error messages

## API Usage

### GeocodingService Methods

```typescript
// Initialize the service
await geocodingService.init();

// Geocode an address
const result = await geocodingService.geocodeAddress("Connaught Place, New Delhi");

// Get place suggestions
const suggestions = await geocodingService.getPlaceSuggestions("DLF");

// Get current location
const location = await geocodingService.getCurrentLocation();

// Get place details by ID
const details = await geocodingService.getPlaceDetails(placeId);
```

## Error Handling

The service includes comprehensive error handling:
- **API Failures**: Graceful fallback to dummy data
- **Network Issues**: User-friendly error messages
- **Permission Denied**: Clear instructions for enabling location
- **Invalid Addresses**: Helpful suggestions for corrections

## Security Considerations

1. **API Key Restrictions**: Restrict your API key to specific domains
2. **Rate Limiting**: Google Maps has usage limits
3. **Billing**: Monitor your Google Cloud billing
4. **Environment Variables**: Never commit API keys to version control

## Testing

1. **Start the app**: `npm run dev`
2. **Test location search**: Type in pickup/drop location fields
3. **Test current location**: Click the location icon
4. **Test geocoding**: Select a location and verify coordinates update
5. **Test pricing**: Verify prices update with new coordinates

## Troubleshooting

### Common Issues

1. **"Google Maps API not loaded"**
   - Check if API key is correct
   - Verify APIs are enabled in Google Cloud Console
   - Check browser console for errors

2. **"Geocoding failed"**
   - Check if Geocoding API is enabled
   - Verify API key has proper permissions
   - Check if address is valid

3. **"Places suggestions failed"**
   - Check if Places API is enabled
   - Verify API key restrictions
   - Check network connectivity

4. **Current location not working**
   - Check browser permissions
   - Ensure HTTPS (required for geolocation)
   - Check if location services are enabled

## Cost Optimization

1. **Caching**: Implement caching for repeated searches
2. **Debouncing**: Already implemented (500ms delay)
3. **API Limits**: Monitor usage in Google Cloud Console
4. **Fallback Data**: Use dummy data when possible

## Future Enhancements

- **Map Integration**: Add interactive maps
- **Route Optimization**: Calculate optimal routes
- **Traffic Data**: Real-time traffic information
- **Offline Support**: Cache frequently used locations








