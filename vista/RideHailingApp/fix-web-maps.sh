#!/bin/bash

echo "🗺️ FIXING REACT-NATIVE-MAPS WEB ISSUE..."
echo "========================================"

echo "🔍 Issue: react-native-maps doesn't work on web"
echo "🔧 Solution: Use web-compatible version temporarily"
echo ""

# Backup original App.tsx
if [ ! -f "App.original.backup.tsx" ]; then
    cp App.tsx App.original.backup.tsx
    echo "✅ Original App.tsx backed up"
fi

# Use web-compatible version
cp App.web.tsx App.tsx
echo "✅ Using web-compatible App.tsx"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --ignore-scripts

echo ""
echo "🚀 STARTING WEB VERSION..."
echo "=========================="
echo "✅ Running: npx expo start --web --clear"
echo ""

# Start expo
npx expo start --web --clear &

echo ""
echo "🎯 WHAT TO EXPECT:"
echo "• Web app opens at http://localhost:19006"
echo "• Login screen with phone authentication"
echo "• Backend API integration working"
echo "• Maps replaced with interactive placeholder"
echo "• All features work except native maps"
echo ""
echo "📱 FOR FULL MAPS: Use mobile version later"
echo "🔄 TO RESTORE: cp App.original.backup.tsx App.tsx"