# 🏗️ Separated Architecture: Backend API + Mobile App

## **🎯 Architecture Overview**

The ride-hailing application has been **completely separated** into two independent projects:

```
workspace/
├── ride-hailing-backend/     # 🚗 Standalone Backend API
│   ├── server-simple.js      # Development server (in-memory)
│   ├── package.json          # Backend dependencies
│   ├── .env.example          # Backend configuration template
│   ├── start.sh              # Quick start script
│   └── README.md             # Backend documentation
│
├── ride-hailing-mobile/      # 📱 Standalone Mobile App
│   ├── src/                  # React Native/Expo app
│   ├── package.json          # Mobile dependencies
│   ├── .env.example          # Mobile configuration template
│   ├── start.sh              # Quick start script
│   └── README.md             # Mobile documentation
│
└── SEPARATED_ARCHITECTURE.md # This overview
```

---

## **🔄 Benefits of Separation**

### **✅ Independent Development**
- **Backend team** can work on API independently
- **Mobile team** can focus on UI/UX without backend concerns
- **Different deployment cycles** - deploy backend and mobile separately
- **Technology flexibility** - swap backend/frontend technologies easily

### **✅ Scalability**
- **Horizontal scaling** - scale backend independently
- **Multiple frontends** - same backend can serve web, mobile, desktop
- **Microservices ready** - easy to split backend into microservices
- **Cloud deployment** - deploy to different cloud providers

### **✅ Maintenance**
- **Separate repositories** - cleaner version control
- **Independent testing** - test backend and mobile separately
- **Different teams** - specialized teams for each component
- **Clear boundaries** - well-defined API contracts

---

## **🚀 Quick Start Guide**

### **Option 1: Start Both Projects**

#### **Terminal 1: Backend**
```bash
cd ride-hailing-backend
./start.sh
# Backend runs on http://localhost:3000
```

#### **Terminal 2: Mobile**
```bash
cd ride-hailing-mobile
./start.sh
# Choose tunnel mode for mobile testing
```

### **Option 2: Manual Setup**

#### **Backend Setup**
```bash
cd ride-hailing-backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run start:simple
```

#### **Mobile Setup**
```bash
cd ride-hailing-mobile
npm install --legacy-peer-deps --ignore-scripts
cp .env.example .env
# Edit .env with backend URL
npx expo start --tunnel
```

---

## **🔗 Communication Between Projects**

### **API Integration**
```typescript
// Mobile app configuration (.env)
EXPO_PUBLIC_API_URL=http://localhost:3000/api

// Backend endpoints
POST /api/auth/request-otp
POST /api/auth/verify-otp
GET  /api/drivers/nearby
POST /api/rides/request
GET  /api/rides/:id
```

### **Real-time Communication**
```typescript
// WebSocket connection
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3000

// Features:
// - Live driver tracking
// - Ride status updates
// - Real-time notifications
```

---

## **📱 Mobile Development**

### **Testing Options**

#### **Physical Device (Recommended)**
```bash
cd ride-hailing-mobile
npx expo start --tunnel
# Scan QR with Expo Go app
# Works from anywhere
```

#### **Simulators/Emulators**
```bash
# iOS Simulator (macOS only)
npx expo run:ios

# Android Emulator
npx expo run:android

# Web Browser
npx expo start --web
```

### **Environment Configuration**
```bash
# For tunnel mode (mobile devices)
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For local network (same WiFi)
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api

# For production
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## **🚗 Backend Development**

### **Development Mode**
```bash
cd ride-hailing-backend
npm run start:simple
# Uses in-memory database
# No PostgreSQL required
# Perfect for development
```

### **Production Mode**
```bash
cd ride-hailing-backend
# Setup PostgreSQL + PostGIS
npm run start
# Uses real database
# Production ready
```

### **Environment Configuration**
```bash
# Development
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret

# Production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=production-secret
GOOGLE_MAPS_API_KEY=real-api-key
```

---

## **🔧 Development Workflow**

### **Typical Development Session**

1. **Start Backend**
   ```bash
   cd ride-hailing-backend
   ./start.sh
   # Backend API ready at localhost:3000
   ```

2. **Start Mobile App**
   ```bash
   cd ride-hailing-mobile
   ./start.sh
   # Choose tunnel mode
   # Scan QR with Expo Go
   ```

3. **Development Cycle**
   - Edit backend code → API changes reflected immediately
   - Edit mobile code → Hot reload updates app instantly
   - Test API with mobile app → Full integration testing
   - Debug issues independently in backend or mobile

### **Team Development**

#### **Backend Developer**
```bash
cd ride-hailing-backend
npm run start:simple
# Focus on API development
# Test with curl/Postman
# Deploy backend independently
```

#### **Mobile Developer**
```bash
cd ride-hailing-mobile
# Point to staging/production backend
EXPO_PUBLIC_API_URL=https://api-staging.yourdomain.com/api
npx expo start --tunnel
# Focus on UI/UX development
# Test with real backend
```

---

## **📊 API Contract**

### **Authentication Flow**
```typescript
// 1. Request OTP
POST /api/auth/request-otp
{
  "phone": "+1234567890"
}
Response: { "success": true, "sessionId": "uuid" }

// 2. Verify OTP
POST /api/auth/verify-otp
{
  "sessionId": "uuid",
  "otp": "123456"
}
Response: { "success": true, "token": "jwt", "user": {...} }

// 3. Authenticated requests
Headers: { "Authorization": "Bearer jwt-token" }
```

### **Core Endpoints**
```typescript
// User management
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/location

// Driver operations
GET    /api/drivers/nearby
POST   /api/drivers/status
GET    /api/drivers/profile

// Ride booking
POST   /api/rides/request
GET    /api/rides/:id
PUT    /api/rides/:id/accept
PUT    /api/rides/:id/cancel
PUT    /api/rides/:id/complete

// Maps & navigation
GET    /api/maps/directions
POST   /api/maps/fare-estimate
```

---

## **🚀 Deployment Options**

### **Backend Deployment**

#### **Cloud Platforms**
```bash
# Heroku
git push heroku main
heroku addons:create heroku-postgresql

# Railway
railway deploy
railway add postgresql

# AWS/Google Cloud/Azure
# Deploy via Docker or serverless
```

#### **Docker Deployment**
```dockerfile
# Dockerfile already included
docker build -t ride-hailing-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  ride-hailing-api
```

### **Mobile Deployment**

#### **Development Builds**
```bash
cd ride-hailing-mobile
npx eas build --platform all
# Creates .apk/.ipa for testing
```

#### **App Store Release**
```bash
npx eas build --platform all --profile production
npx eas submit --platform all
# Submits to App Store & Google Play
```

#### **Over-the-Air Updates**
```bash
npx eas update
# Update app without app store
# Users get updates automatically
```

---

## **🛠️ Troubleshooting**

### **Common Issues**

#### **Backend Not Accessible from Mobile**
```bash
# Solution 1: Use tunnel mode
cd ride-hailing-mobile
npx expo start --tunnel

# Solution 2: Check .env configuration
cat .env
# Ensure EXPO_PUBLIC_API_URL is correct

# Solution 3: Verify backend is running
curl http://localhost:3000/health
```

#### **Mobile App Won't Connect**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check environment variables
echo $EXPO_PUBLIC_API_URL

# Clear cache and restart
npx expo start --clear --tunnel
```

#### **Database Issues**
```bash
# Use in-memory mode for development
cd ride-hailing-backend
npm run start:simple

# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"
```

---

## **📈 Next Steps**

### **Immediate Development**
1. **Get Google Maps API key** - Required for maps functionality
2. **Test mobile app** - Use tunnel mode for device testing
3. **Customize features** - Add your specific business logic
4. **Setup CI/CD** - Automated testing and deployment

### **Production Readiness**
1. **Database setup** - PostgreSQL with PostGIS
2. **Security hardening** - HTTPS, proper JWT secrets
3. **Monitoring** - Error tracking, performance monitoring
4. **Scaling** - Load balancers, CDN, caching

### **Feature Additions**
1. **Payment integration** - Stripe, Razorpay, etc.
2. **Push notifications** - Expo notifications
3. **Advanced maps** - Traffic, multiple stops
4. **Driver ratings** - Rating and review system

---

## **✨ Architecture Benefits Summary**

### **🔧 Development**
- ✅ **Independent development** - Teams can work separately
- ✅ **Technology flexibility** - Change backend/frontend independently
- ✅ **Clear separation** - Well-defined API boundaries
- ✅ **Easy testing** - Test components independently

### **🚀 Deployment**
- ✅ **Independent deployment** - Deploy backend and mobile separately
- ✅ **Scalability** - Scale components independently
- ✅ **Multiple frontends** - Same backend, multiple apps
- ✅ **Cloud ready** - Deploy to any cloud platform

### **🛠️ Maintenance**
- ✅ **Specialized teams** - Backend and mobile experts
- ✅ **Version control** - Separate repositories
- ✅ **Documentation** - Clear component documentation
- ✅ **Future-proof** - Easy to evolve architecture

---

**🎉 You now have a professional, scalable, and maintainable ride-hailing application with complete backend-frontend separation!** 🚀