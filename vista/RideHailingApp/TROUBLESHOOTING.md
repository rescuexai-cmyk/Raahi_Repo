# 🔧 BLANK PAGE TROUBLESHOOTING GUIDE

## **🚨 IMMEDIATE FIXES FOR BLANK PAGE**

### **1. Critical Missing Files (MOST COMMON CAUSE)**

#### **A. Missing .env file**
The `.env` file is REQUIRED and was missing from your project:

```bash
# Create .env file in project root (already done)
# File should contain:
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=demo_google_maps_key
EXPO_PUBLIC_SUPABASE_URL=https://demo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=demo_key
EXPO_PUBLIC_JWT_SECRET=demo_jwt_secret
EXPO_PUBLIC_RAZORPAY_KEY_ID=demo_razorpay_key
```

#### **B. Missing backend connection**
```bash
# Make sure backend is running:
cd api-server
npm run start:simple

# Should show:
# 🚀 Mock Ride Hailing API Server running on port 3000
# 📱 Ready for mobile app integration!
```

### **2. Debug Steps (Try in order)**

#### **Step 1: Test with Debug App**
```bash
# Rename current App.tsx temporarily
mv App.tsx App.original.tsx

# Copy debug version
cp App.debug.tsx App.tsx

# Start app
npx expo start --clear

# You should see: "🎉 Ride Hailing App - Debug Mode - App is Working!"
```

#### **Step 2: Test with Safe App (has error catching)**
```bash
# Use the safe version instead
cp App.safe.tsx App.tsx

# Start app - this will show actual error messages
npx expo start --clear
```

#### **Step 3: Check Console for Errors**
In your terminal where `npx expo start` is running, look for:
- ❌ Red error messages
- ⚠️ Yellow warnings about missing packages
- 🚨 Import errors
- 💥 Network connection errors

### **3. Common Issues & Solutions**

#### **Issue: "Cannot resolve @env"**
```bash
# Solution:
rm -rf node_modules
npm install --legacy-peer-deps
npx expo start --clear
```

#### **Issue: "Network request failed"**
```bash
# Make sure backend is running:
curl http://localhost:3000/health

# Should return: {"status":"healthy"...}

# If not working, start backend:
cd api-server && npm run start:simple
```

#### **Issue: "Module not found" errors**
```bash
# Reinstall dependencies:
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### **Issue: Expo cache issues**
```bash
# Clear all caches:
npx expo start --clear
# or
rm -rf .expo
npx expo start
```

### **4. Device/Platform Specific**

#### **Web Browser**
```bash
# Start and press 'w' for web
npx expo start
# Press 'w'

# If maps don't work on web, that's normal
# Focus on authentication and basic UI
```

#### **iOS Simulator**
```bash
# Press 'i' after expo start
npx expo start
# Press 'i'
```

#### **Android Emulator**
```bash
# Press 'a' after expo start
npx expo start
# Press 'a'
```

#### **Physical Device**
```bash
# Install Expo Go app
# Scan QR code from terminal

# If on different network, update .env:
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000/api
```

### **5. Step-by-Step Recovery**

#### **Complete Reset & Setup:**
```bash
# 1. Stop all running processes
# Ctrl+C to stop expo and backend

# 2. Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 3. Ensure .env exists (check file in root)
cat .env
# Should show environment variables

# 4. Start backend
cd api-server
npm run start:simple &
cd ..

# 5. Test backend
curl http://localhost:3000/health

# 6. Start frontend with debug
cp App.debug.tsx App.tsx
npx expo start --clear

# 7. If debug works, restore original
mv App.original.tsx App.tsx
npx expo start --clear
```

### **6. Quick Diagnostic Commands**

```bash
# Check if files exist
ls -la .env App.tsx src/

# Check backend
curl http://localhost:3000/health

# Check expo status
npx expo doctor

# Check node version
node --version  # Should be 16+

# Check dependencies
npm list react react-native
```

### **7. What Should Work After Fixes**

#### **✅ Expected Success Indicators:**
- App shows login screen (not blank)
- Console shows: "🚀 App is starting..."
- Backend health endpoint returns JSON
- No red errors in console
- Navigation works

#### **✅ Features That Should Work:**
- Login screen with phone input
- Maps (basic view, may need real API key)
- Navigation between screens
- Basic UI components

### **8. Still Having Issues?**

#### **Get More Debug Info:**
```bash
# Use the safe app version that shows errors
cp App.safe.tsx App.tsx
npx expo start --clear

# Check specific service imports
node -e "console.log(require('./src/services/apiClient.js'))"

# Check if environment variables are loaded
node -e "console.log(process.env.EXPO_PUBLIC_API_URL)"
```

#### **Fallback Options:**
1. **Use Web Version**: Press 'w' - web works even if mobile has issues
2. **Check Network**: Use `http://192.168.1.X:3000/api` instead of localhost
3. **Disable Maps**: Comment out map-related imports temporarily
4. **Use Minimal App**: Keep App.debug.tsx as App.tsx until issues resolved

---

## **📱 MOST LIKELY SOLUTION:**

**The `.env` file was missing!** This file is critical and contains:
- API URL configuration
- Environment variables that the app needs
- Service endpoints

**After creating `.env` file:**
1. Stop expo (`Ctrl+C`)
2. Run: `npx expo start --clear`
3. App should now work!

**If still blank, use the debug app to see actual error messages.**