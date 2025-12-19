# Raahi Backend API

A comprehensive backend API for the Raahi cab booking application built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- **Authentication**: Multiple auth methods (Mobile OTP, Google OAuth, Truecaller)
- **Ride Management**: Complete ride lifecycle from booking to completion
- **Dynamic Pricing**: Advanced pricing algorithm with surge pricing and peak hours
- **Real-time Tracking**: WebSocket-based live location updates
- **Driver Management**: Driver registration, verification, and earnings
- **Payment Integration**: Support for multiple payment methods
- **Notification System**: SMS and email notifications
- **Comprehensive Testing**: Full test suite with Jest
- **API Documentation**: Well-documented REST APIs

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management and caching
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io for WebSocket connections
- **Testing**: Jest with Supertest
- **Validation**: Joi and express-validator
- **Logging**: Winston
- **Email**: Nodemailer
- **SMS**: Twilio

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd raahi-backend
npm install
```

### 2. Environment Setup

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

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

# SMS (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Maps API
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "countryCode": "+91"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456",
  "countryCode": "+91"
}
```

#### Google Authentication
```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google-id-token"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

### Pricing Endpoints

#### Calculate Fare
```http
POST /api/pricing/calculate
Content-Type: application/json

{
  "pickupLat": 28.6139,
  "pickupLng": 77.2090,
  "dropLat": 28.5355,
  "dropLng": 77.3910,
  "vehicleType": "sedan",
  "scheduledTime": "2024-01-15T10:30:00Z"
}
```

#### Get Nearby Drivers
```http
GET /api/pricing/nearby-drivers?lat=28.6139&lng=77.2090&radius=5
```

### Ride Endpoints

#### Create Ride
```http
POST /api/rides
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "pickupLat": 28.6139,
  "pickupLng": 77.2090,
  "dropLat": 28.5355,
  "dropLng": 77.3910,
  "pickupAddress": "Connaught Place, New Delhi",
  "dropAddress": "India Gate, New Delhi",
  "paymentMethod": "CASH"
}
```

#### Get User Rides
```http
GET /api/rides?page=1&limit=10
Authorization: Bearer <access-token>
```

#### Update Ride Status
```http
PUT /api/rides/:id/status
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "status": "RIDE_STARTED"
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Structure
```
src/tests/
├── setup.ts           # Test setup and teardown
├── auth.test.ts       # Authentication tests
├── pricing.test.ts    # Pricing algorithm tests
├── ride.test.ts       # Ride management tests
└── driver.test.ts     # Driver management tests
```

## 🏗 Project Structure

```
src/
├── controllers/       # Route controllers
├── database/          # Database connection and migrations
├── middleware/        # Custom middleware
├── routes/           # API routes
├── services/         # Business logic services
├── tests/            # Test files
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Application entry point
```

## 🔧 Services

### Pricing Service
- Dynamic fare calculation based on distance, time, and demand
- Surge pricing for high-demand areas
- Peak hour multipliers
- Real-time pricing updates

### Authentication Service
- Multi-provider authentication (OTP, Google, Truecaller)
- JWT token management with refresh tokens
- User profile management
- Session management with Redis

### Ride Service
- Complete ride lifecycle management
- Real-time driver tracking
- Ride status updates
- Cancellation handling

### SMS Service
- OTP delivery via Twilio
- Ride confirmation messages
- Status update notifications

### Email Service
- Welcome emails
- Ride receipts
- Driver verification notifications

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- SQL injection prevention with Prisma
- XSS protection

## 📊 Database Schema

The database includes the following main entities:

- **Users**: Passenger and driver profiles
- **Drivers**: Driver-specific information and documents
- **Rides**: Ride bookings and tracking
- **PricingRules**: Dynamic pricing configuration
- **SurgeAreas**: High-demand area definitions
- **Notifications**: User notifications
- **RefreshTokens**: JWT refresh token management

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Configure production database URL
- Set up Redis instance
- Configure external services (Twilio, Google, etc.)

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 📈 Performance Features

- Redis caching for frequently accessed data
- Database connection pooling
- Optimized queries with Prisma
- Compression middleware
- Request rate limiting
- Efficient WebSocket connections

## 🔍 Monitoring and Logging

- Winston-based logging with multiple transports
- Error tracking and reporting
- Performance monitoring
- Request/response logging
- Database query logging (development)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

---

**Built with ❤️ for seamless transportation experiences**

