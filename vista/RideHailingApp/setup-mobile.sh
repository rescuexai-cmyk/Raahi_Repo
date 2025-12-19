#!/bin/bash

echo "📱 MOBILE EXPO SETUP FOR RIDE HAILING APP"
echo "=========================================="

# Get computer's IP address
echo "🔍 Detecting your computer's IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
else
    # Windows (Git Bash)
    IP=$(ipconfig | grep -o "IPv4.*: [0-9]*\.[0-9]*\.[0-9]*\.[0-9]*" | grep -o "[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*" | head -1)
fi

if [ -z "$IP" ]; then
    echo "❌ Could not detect IP address automatically"
    echo "📝 Please find your IP manually:"
    echo "   Mac/Linux: ifconfig | grep inet"
    echo "   Windows: ipconfig"
    read -p "Enter your computer's IP address: " IP
fi

echo "✅ Using IP address: $IP"

# Update .env file
echo "📝 Updating .env file for mobile access..."
cat > .env << EOF
# Supabase Configuration (not used in current setup, but referenced by code)
EXPO_PUBLIC_SUPABASE_URL=https://demo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=demo_key

# Google Maps API Key (replace with your actual key for maps to work)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=demo_google_maps_key

# JWT Secret (for local auth - not critical for basic functionality)
EXPO_PUBLIC_JWT_SECRET=demo_jwt_secret

# WebSocket URL (for real-time features)
EXPO_PUBLIC_WEBSOCKET_URL=ws://$IP:3000

# Backend API URL (critical - must match your backend server)
EXPO_PUBLIC_API_URL=http://$IP:3000/api

# Razorpay Configuration (for payments)
EXPO_PUBLIC_RAZORPAY_KEY_ID=demo_razorpay_key
EOF

echo "✅ .env file updated with IP: $IP"

# Restore original app for mobile
if [ -f "App.original.backup.tsx" ]; then
    cp App.original.backup.tsx App.tsx
    echo "✅ Original mobile app restored"
fi

# Install dependencies (skip iOS scripts for Expo Go)
echo "📦 Installing dependencies for mobile..."
npm install --legacy-peer-deps --ignore-scripts

echo ""
echo "🎯 SETUP COMPLETE!"
echo "=================="
echo ""
echo "📱 MOBILE TESTING INSTRUCTIONS:"
echo "1. Download 'Expo Go' app on your phone/tablet"
echo "2. Make sure your phone is on the same WiFi network"
echo "3. Start backend: cd api-server && npm run start:simple"
echo "4. Start mobile app: npx expo start"
echo "5. Scan QR code with Expo Go app"
echo ""
echo "🗺️ FEATURES AVAILABLE ON MOBILE:"
echo "✅ Real Google Maps integration"
echo "✅ GPS location tracking"
echo "✅ Full ride-hailing experience"
echo "✅ Native performance"
echo "✅ Camera & device features"
echo ""
echo "🔗 API URLs configured for mobile:"
echo "   Backend: http://$IP:3000/api"
echo "   WebSocket: ws://$IP:3000"
echo ""
echo "⚠️  MAKE SURE BACKEND IS RUNNING:"
echo "   cd api-server && npm run start:simple"