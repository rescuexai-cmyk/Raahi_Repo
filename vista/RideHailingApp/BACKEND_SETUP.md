# 🚀 Ride Hailing App - Complete Backend Setup Guide

This guide will help you set up the complete backend API for your ride hailing mobile app.

## 📋 Prerequisites

### Required Software
1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher) with PostGIS extension
3. **npm** or **yarn**

### Installation Steps

#### 1. Install PostgreSQL with PostGIS
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib postgis

# macOS (using Homebrew)
brew install postgresql postgis

# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

#### 2. Create Database and User
```bash
# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE ridehailing;
CREATE USER ridehailing_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ridehailing TO ridehailing_user;

# Connect to the ridehailing database
\c ridehailing

# Enable PostGIS extension
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";

# Exit psql
\q
```

## 🛠️ Backend API Setup

### 1. Install Dependencies
```bash
cd RideHailingApp/api-server
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env
```

**Update these values in `.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ridehailing
DB_USER=ridehailing_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Start the API Server
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

**Expected output:**
```
🔧 Setting up database...
✅ PostGIS extension enabled
✅ Users table created
✅ Drivers table created
✅ Rides table created
... (more setup messages)
🚀 Ride Hailing API Server running on port 3000
📡 WebSocket server ready
🔗 Health check: http://localhost:3000/health
```

## 📱 Mobile App Configuration

### Update Mobile App API URL
1. Edit `RideHailingApp/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
```

2. For device testing, replace `localhost` with your computer's IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
EXPO_PUBLIC_WEBSOCKET_URL=ws://192.168.1.100:3000
```

## 🧪 Testing the Integration

### 1. Test API Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 2. Test Authentication Flow
```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# The OTP will be logged in the server console for testing
```

### 3. Test Mobile App
```bash
# Start mobile app
cd RideHailingApp
npx expo start
```

## 📊 API Endpoints Overview

### Authentication
- `POST /api/auth/request-otp` - Request OTP for phone
- `POST /api/auth/verify-otp` - Verify OTP and sign in
- `POST /api/auth/signout` - Sign out user
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/:id` - Update user profile

### Drivers
- `GET /api/drivers/nearby` - Get nearby drivers
- `GET /api/drivers/:id` - Get driver by ID
- `PUT /api/drivers/:id/location` - Update driver location
- `PUT /api/drivers/:id/status` - Update driver status
- `POST /api/drivers/register` - Register as driver

### Rides
- `POST /api/rides` - Create new ride
- `GET /api/rides/:id` - Get ride details
- `PUT /api/rides/:id/status` - Update ride status
- `GET /api/rides/users/:userId/rides` - Get user's rides

### Real-time Features
- **WebSocket**: `ws://localhost:3000` for real-time updates
- **Location tracking**: Driver location updates
- **Ride matching**: Real-time ride request handling

## 🔒 Security Features

### Authentication
- **JWT tokens** for secure API access
- **OTP verification** for phone-based authentication
- **Rate limiting** to prevent abuse

### Data Protection
- **Input validation** on all endpoints
- **SQL injection protection** with parameterized queries
- **CORS configuration** for cross-origin requests

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_PASSWORD=strong-production-password
JWT_SECRET=cryptographically-strong-secret-key
ALLOWED_ORIGINS=https://yourdomain.com
```

### Database Optimization
```sql
-- Add additional indexes for production
CREATE INDEX CONCURRENTLY idx_drivers_location_available 
ON drivers USING GIST(current_location) 
WHERE is_available = true;

CREATE INDEX CONCURRENTLY idx_rides_status_created 
ON rides(status, created_at);
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Database connection failed
```
**Solution:** Check PostgreSQL is running and credentials are correct.

#### 2. PostGIS Extension Error
```
Error: PostGIS extension not found
```
**Solution:** Install PostGIS and enable it in your database:
```sql
CREATE EXTENSION postgis;
```

#### 3. Mobile App Can't Connect
- Check API URL in mobile app `.env`
- Ensure firewall allows port 3000
- Use computer's IP address instead of localhost for device testing

#### 4. WebSocket Connection Issues
- Check WebSocket URL in mobile app
- Ensure port 3000 is accessible
- Verify server logs for WebSocket errors

## 📈 Monitoring & Logs

### API Logs
```bash
# View server logs
tail -f logs/api.log

# View database queries (development)
# Enable in .env: LOG_LEVEL=debug
```

### Database Monitoring
```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'ridehailing';

-- Check table sizes
SELECT schemaname, tablename, pg_total_relation_size(schemaname||'.'||tablename) as size
FROM pg_tables WHERE schemaname = 'public';
```

## 🎯 Next Steps

1. **Add Google Maps API key** to both mobile and backend `.env` files
2. **Set up SMS service** (Twilio) for production OTP delivery
3. **Configure payment gateway** (Razorpay/Stripe) for payments
4. **Add push notifications** for real-time alerts
5. **Deploy to cloud** (AWS/Google Cloud/DigitalOcean)

## 🔗 API Documentation

Full API documentation available at: `http://localhost:3000/api/docs` (when running)

---

## ✅ Quick Start Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created with PostGIS extension
- [ ] API server dependencies installed
- [ ] Environment variables configured
- [ ] API server running on port 3000
- [ ] Mobile app API URL updated
- [ ] Authentication flow tested
- [ ] Ready for development! 🎉

**Need help?** Check the troubleshooting section or review the server logs for detailed error messages.