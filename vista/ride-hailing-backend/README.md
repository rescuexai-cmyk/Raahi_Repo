# 🚗 Ride Hailing Backend API

A standalone Node.js/Express backend API for the ride hailing application.

## **🚀 Quick Start**

### **Prerequisites**
- Node.js 16+ 
- npm or yarn

### **Installation**
```bash
# Clone and install
git clone <repository-url>
cd ride-hailing-backend
npm install
```

### **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=postgresql://username:password@localhost:5432/ridehailing
# JWT_SECRET=your-secret-key
# PORT=3000
```

### **Running the Server**

#### **Development Mode (In-Memory Database)**
```bash
npm run dev
# or
npm run start:simple
```

#### **Production Mode (PostgreSQL)**
```bash
npm run start
```

### **Testing the API**
```bash
# Health check
curl http://localhost:3000/health

# Test endpoints
curl http://localhost:3000/api/auth/request-otp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

---

## **📋 API Endpoints**

### **Authentication**
- `POST /api/auth/request-otp` - Request OTP for phone number
- `POST /api/auth/verify-otp` - Verify OTP and get auth token
- `GET /api/auth/me` - Get current user profile

### **Users**
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/location` - Update user location

### **Drivers**
- `GET /api/drivers/nearby` - Get nearby drivers
- `POST /api/drivers/status` - Update driver status
- `GET /api/drivers/profile` - Get driver profile

### **Rides**
- `POST /api/rides/request` - Request a ride
- `GET /api/rides/:id` - Get ride details
- `PUT /api/rides/:id/accept` - Accept ride (driver)
- `PUT /api/rides/:id/cancel` - Cancel ride
- `PUT /api/rides/:id/complete` - Complete ride

### **Maps & Routing**
- `GET /api/maps/directions` - Get directions between points
- `POST /api/maps/fare-estimate` - Calculate fare estimate

---

## **🗄️ Database Setup**

### **Using In-Memory Database (Development)**
```bash
npm run start:simple
# No database setup required
# Data is stored in memory (resets on restart)
```

### **Using PostgreSQL (Production)**
```bash
# Install PostgreSQL with PostGIS
# Ubuntu/Debian:
sudo apt-get install postgresql postgis

# macOS:
brew install postgresql postgis

# Create database
createdb ridehailing

# Run database setup
npm run db:setup
```

---

## **🔧 Configuration**

### **Environment Variables**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/ridehailing

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:19006,exp://192.168.1.100:19000
```

### **CORS Setup for Mobile**
The API is configured to accept requests from:
- Expo development server (`exp://` URLs)
- Web development (`http://localhost:19006`)
- Mobile apps via tunnel mode
- Custom origins (configurable)

---

## **📱 Mobile App Integration**

### **API Base URL Configuration**
The mobile app should use these URLs:

#### **Local Development**
```bash
# For Expo tunnel mode
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For local network testing
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api
```

#### **Production**
```bash
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

---

## **🔒 Authentication Flow**

### **1. Request OTP**
```bash
POST /api/auth/request-otp
{
  "phone": "+1234567890"
}

Response:
{
  "success": true,
  "sessionId": "uuid-session-id",
  "message": "OTP sent successfully"
}
```

### **2. Verify OTP**
```bash
POST /api/auth/verify-otp
{
  "sessionId": "uuid-session-id",
  "otp": "123456",
  "userData": {
    "name": "John Doe",
    "user_type": "rider"
  }
}

Response:
{
  "success": true,
  "token": "jwt-token",
  "user": { ... }
}
```

### **3. Authenticated Requests**
```bash
Authorization: Bearer jwt-token
```

---

## **🧪 Testing**

### **Manual Testing**
```bash
# Start server
npm run start:simple

# Test health endpoint
curl http://localhost:3000/health

# Test OTP request
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

### **Automated Tests**
```bash
npm test
```

---

## **🚀 Deployment**

### **Docker**
```bash
# Build image
docker build -t ride-hailing-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  ride-hailing-api
```

### **Cloud Platforms**
- **Heroku:** Push to Heroku with PostgreSQL addon
- **AWS:** Deploy to ECS/Fargate with RDS
- **Google Cloud:** Deploy to Cloud Run with Cloud SQL
- **Vercel:** Deploy serverless functions

---

## **🔄 WebSocket Support**

### **Real-time Features**
- Driver location tracking
- Ride status updates
- Live trip tracking

### **WebSocket Endpoints**
```bash
ws://localhost:3000/ws
```

---

## **📊 Monitoring & Logging**

### **Health Checks**
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status

### **Logging**
- Request/response logging
- Error tracking
- Performance monitoring

---

## **🛡️ Security**

### **Features**
- JWT token authentication
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention

### **Best Practices**
- Use HTTPS in production
- Rotate JWT secrets regularly
- Implement proper rate limiting
- Validate all inputs
- Use parameterized queries

---

## **📈 Performance**

### **Optimizations**
- Database connection pooling
- Response caching
- Optimized database queries
- Compression middleware

### **Scaling**
- Horizontal scaling support
- Load balancer ready
- Stateless design
- Database read replicas

---

## **🏗️ Architecture**

```
├── server.js              # Main server file
├── server-simple.js       # Development server (in-memory)
├── routes/                 # API route handlers
│   ├── auth.js
│   ├── users.js
│   ├── drivers.js
│   ├── rides.js
│   └── maps.js
├── middleware/             # Express middleware
│   ├── auth.js
│   ├── validation.js
│   └── cors.js
├── models/                 # Data models
├── utils/                  # Utility functions
└── config/                 # Configuration files
```

---

## **📞 Support**

- **Documentation:** See `/docs` folder
- **API Reference:** Available at `/api-docs` when server is running
- **Issues:** Create GitHub issues for bugs/features
- **Contributing:** See CONTRIBUTING.md

---

## **✨ Features**

- ✅ **Authentication** - Phone + OTP based auth
- ✅ **User Management** - Riders and drivers
- ✅ **Ride Booking** - Complete ride lifecycle
- ✅ **Real-time Tracking** - WebSocket integration
- ✅ **Maps Integration** - Google Maps API
- ✅ **Payment Ready** - Payment integration hooks
- ✅ **Mobile Optimized** - Built for mobile apps
- ✅ **Production Ready** - Scalable architecture

**The backend API is completely independent and can be used with any frontend!** 🚀