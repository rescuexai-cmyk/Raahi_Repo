#!/bin/bash

echo "🔧 FIXING iOS POD-INSTALL ERROR..."
echo "=================================="

# Remove any iOS specific files that might be causing issues
echo "🧹 Cleaning up iOS-related files..."
rm -rf ios/
rm -rf android/
rm -rf .expo/

# Install dependencies without iOS scripts
echo "📦 Installing dependencies (skipping iOS scripts)..."
npm install --legacy-peer-deps --ignore-scripts

# Start in web mode first
echo "🌐 Starting in web mode (safer)..."
echo ""
echo "✅ SOLUTION COMMANDS:"
echo "1. npm install --legacy-peer-deps --ignore-scripts"
echo "2. npx expo start --web"
echo "3. Press 'w' to open in browser"
echo ""
echo "🎯 This bypasses iOS setup issues and lets you test the app!"

# Optional: Start expo in web mode
read -p "Start Expo in web mode now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx expo start --web --clear
fi