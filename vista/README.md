# Raahi - Ride Hailing Application

A modern, full-stack ride-hailing application built with React/TypeScript frontend and Node.js/Express backend.

## Features

- **User Authentication** - Secure login/signup with OTP verification
- **Real-time Ride Booking** - Book rides with live driver tracking
- **Driver Dashboard** - Comprehensive driver interface for managing rides
- **Live Location Tracking** - Real-time GPS tracking for rides
- **Price Estimation** - Dynamic pricing based on distance and demand
- **Payment Integration** - Multiple payment options
- **Ride History** - Complete ride history for users and drivers

## Tech Stack

### Frontend
- React 18 with TypeScript 
- Vite for development and building
- Tailwind CSS for styling
- Google Maps API for mapping
- Socket.IO for real-time features

### Backend  
- Node.js with Express
- TypeScript
- Prisma ORM with PostgreSQL
- Socket.IO for real-time communication
- JWT authentication
- Redis for caching

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis server
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sarthakmishra912-sketch/vista.git
   cd vista
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd raahi-backend
   npm install
   ```

4. **Set up environment variables**
   - Copy `raahi-backend/env.example` to `raahi-backend/.env`
   - Add your database URL, Google Maps API key, etc.

5. **Set up the database**
   ```bash
   cd raahi-backend
   npx prisma migrate dev
   npx prisma db seed
   ```

6. **Start the development servers**
   
   Backend:
   ```bash
   cd raahi-backend
   npm run dev
   ```
   
   Frontend:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/          # API services
│   ├── contexts/          # React contexts
│   └── utils/             # Utility functions
├── raahi-backend/         # Backend source code
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Backend utilities
│   └── prisma/            # Database schema and migrations
└── public/                # Static assets
```

## API Documentation

The backend provides REST APIs for:
- User authentication (`/api/auth`)
- Ride management (`/api/rides`)
- Driver operations (`/api/drivers`)
- Real-time updates via Socket.IO

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
