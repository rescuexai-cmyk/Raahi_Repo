# Raahi Complete Setup Guide

This guide will help you set up the complete Raahi cab booking application with both frontend and backend.

## 🏗 Architecture Overview

- **Frontend**: React + TypeScript + Vite (Port 3000)
- **Backend**: Node.js + Express + TypeScript (Port 5000)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.io

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher)
- **Redis** (v6 or higher)
- **Git**

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd Raahi-1.0

# Install frontend dependencies
npm install

# Install backend dependencies
cd raahi-backend
npm install
cd ..
```

### 2. Database Setup

#### PostgreSQL Setup
```bash
# Create database
createdb raahi_db

# Or using psql
psql -U postgres
CREATE DATABASE raahi_db;
\q
```

#### Redis Setup
```bash
# Start Redis server
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 3. Environment Configuration

#### Backend Environment
```bash
cd raahi-backend
cp env.example .env
```

Update `raahi-backend/.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/raahi_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# SMS (Twilio) - Optional for development
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Google OAuth - Optional for development
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Maps API - Optional for development
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

#### Frontend Environment
```bash
# Create frontend .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 4. Database Migration and Seeding

```bash
cd raahi-backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 5. Start the Application

#### Terminal 1 - Backend
```bash
cd raahi-backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
npm run dev
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 🧪 Testing

### Backend Tests
```bash
cd raahi-backend
npm test
```

### Frontend Tests
```bash
npm test
```

## 📊 Database Management

### Prisma Studio
```bash
cd raahi-backend
npm run db:studio
```

### Reset Database
```bash
cd raahi-backend
npx prisma migrate reset
npm run db:seed
```

## 🔧 Development Tools

### Backend Development
- **Hot Reload**: `npm run dev`
- **Build**: `npm run build`
- **Type Check**: `npx tsc --noEmit`

### Frontend Development
- **Hot Reload**: `npm run dev`
- **Build**: `npm run build`
- **Type Check**: `npx tsc --noEmit`

## 📱 API Testing

### Using curl

#### Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "countryCode": "+91"}'
```

#### Calculate Fare
```bash
curl -X POST http://localhost:5000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLat": 28.6139,
    "pickupLng": 77.2090,
    "dropLat": 28.5355,
    "dropLng": 77.3910
  }'
```

### Using Postman
Import the API collection from `raahi-backend/postman/` (if available)

## 🚀 Production Deployment

### Backend Deployment
```bash
cd raahi-backend
npm run build
npm start
```

### Frontend Deployment
```bash
npm run build
# Deploy the 'dist' folder to your hosting service
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check PostgreSQL is running
pg_ctl status

# Check database exists
psql -U postgres -l | grep raahi_db
```

#### 2. Redis Connection Error
```bash
# Check Redis is running
redis-cli ping
# Should return PONG
```

#### 3. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

#### 4. TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm install
```

### Logs

#### Backend Logs
```bash
cd raahi-backend
tail -f logs/combined.log
```

#### Frontend Logs
Check browser console for frontend errors.

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/truecaller` - Truecaller auth
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Pricing Endpoints
- `POST /api/pricing/calculate` - Calculate fare
- `GET /api/pricing/nearby-drivers` - Get nearby drivers
- `GET /api/pricing/surge-areas` - Get surge areas
- `GET /api/pricing/rules` - Get pricing rules

### Ride Endpoints
- `POST /api/rides` - Create ride
- `GET /api/rides` - Get user rides
- `GET /api/rides/:id` - Get ride by ID
- `PUT /api/rides/:id/status` - Update ride status
- `POST /api/rides/:id/cancel` - Cancel ride

## 🎯 Features Implemented

### ✅ Backend Features
- [x] User authentication (OTP, Google, Truecaller)
- [x] Dynamic pricing algorithm
- [x] Ride management system
- [x] Real-time tracking with WebSockets
- [x] Driver management
- [x] Payment integration
- [x] SMS and email notifications
- [x] Comprehensive test suite
- [x] API documentation

### ✅ Frontend Features
- [x] React + TypeScript setup
- [x] Authentication context
- [x] Pricing context
- [x] API integration
- [x] Responsive design
- [x] Real-time updates

## 🔐 Security Features

- JWT-based authentication
- Rate limiting
- Input validation
- CORS protection
- SQL injection prevention
- XSS protection

## 📈 Performance Features

- Redis caching
- Database connection pooling
- Optimized queries
- Compression middleware
- Lazy loading
- Code splitting

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all services are running
4. Verify environment variables are set correctly
5. Check database and Redis connections

## 📄 License

This project is licensed under the MIT License.

---

**Happy coding! 🚀**

