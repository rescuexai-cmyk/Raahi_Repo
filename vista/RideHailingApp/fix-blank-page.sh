#!/bin/bash

echo "🔧 FIXING BLANK PAGE ISSUES..."
echo "================================"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file missing - creating it..."
    cat > .env << EOF
# Supabase Configuration (not used in current setup, but referenced by code)
EXPO_PUBLIC_SUPABASE_URL=https://demo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=demo_key

# Google Maps API Key (replace with your actual key for maps to work)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=demo_google_maps_key

# JWT Secret (for local auth - not critical for basic functionality)
EXPO_PUBLIC_JWT_SECRET=demo_jwt_secret

# WebSocket URL (for real-time features)
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3000

# Backend API URL (critical - must match your backend server)
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Razorpay Configuration (for payments)
EXPO_PUBLIC_RAZORPAY_KEY_ID=demo_razorpay_key
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file exists"
fi

# Check if backend is running
echo "🔍 Checking backend status..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not running - please start it:"
    echo "   cd api-server && npm run start:simple"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules missing - installing..."
    npm install --legacy-peer-deps
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies exist"
fi

# Create backup of App.tsx
if [ ! -f "App.original.tsx" ]; then
    cp App.tsx App.original.tsx
    echo "✅ Backup of App.tsx created"
fi

echo ""
echo "🚀 NEXT STEPS:"
echo "1. Start backend: cd api-server && npm run start:simple"
echo "2. Start app: npx expo start --clear"
echo "3. If still blank, try debug mode: cp App.debug.tsx App.tsx"
echo ""
echo "📖 See TROUBLESHOOTING.md for more details"