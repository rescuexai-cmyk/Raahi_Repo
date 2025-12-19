import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
// import { connectRedis } from './utils/redis';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import rideRoutes from './routes/ride';
import driverRoutes from './routes/driver';
import driverOnboardingRoutes from './routes/driverOnboarding';
import adminRoutes from './routes/admin';
import pricingRoutes from './routes/pricing';
import notificationRoutes from './routes/notification';
import realTimeRoutes from './routes/realTime';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3005"
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Rate limiting - Very lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // Very high limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005"
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver/onboarding', driverOnboardingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/realtime', realTimeRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  console.log(`🔌 WebSocket client connected: ${socket.id}`);
  
  // Handle ride room joining
  socket.on('join-ride', (rideId) => {
    socket.join(`ride-${rideId}`);
    logger.info(`Client ${socket.id} joined ride ${rideId}`);
  });
  
  socket.on('leave-ride', (rideId) => {
    socket.leave(`ride-${rideId}`);
    logger.info(`Client ${socket.id} left ride ${rideId}`);
  });

  // Handle driver room joining
  socket.on('join-driver', (driverId) => {
    socket.join(`driver-${driverId}`);
    logger.info(`Driver ${driverId} connected with socket ${socket.id}`);
  });

  socket.on('leave-driver', (driverId) => {
    socket.leave(`driver-${driverId}`);
    logger.info(`Driver ${driverId} disconnected from socket ${socket.id}`);
  });

  // Handle ride request acceptance
  socket.on('accept-ride-request', async (data) => {
    try {
      const { rideId, driverId } = data;
      logger.info(`Driver ${driverId} accepting ride ${rideId}`);
      
      // Emit to passenger that driver accepted
      io.to(`ride-${rideId}`).emit('ride-accepted', {
        rideId,
        driverId,
        timestamp: new Date().toISOString()
      });

      // Notify other drivers (excluding the accepting driver) that ride is taken
      socket.broadcast.emit('ride-taken', {
        rideId,
        driverId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling ride acceptance:', error);
    }
  });

  // Handle ride request rejection
  socket.on('reject-ride-request', (data) => {
    try {
      const { rideId, driverId } = data;
      logger.info(`Driver ${driverId} rejected ride ${rideId}`);
      
      // Could implement logic to find next available driver
      // For now, just log the rejection
    } catch (error) {
      logger.error('Error handling ride rejection:', error);
    }
  });

  // Handle driver arrival notification
  socket.on('driver-arrived', (data) => {
    try {
      const { rideId, driverId } = data;
      logger.info(`Driver ${driverId} arrived at pickup for ride ${rideId}`);
      
      // Notify passenger that driver has arrived
      io.to(`ride-${rideId}`).emit('driver-arrived', {
        rideId,
        driverId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling driver arrival:', error);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');
    
    // Redis disabled for now
    logger.info('Redis disabled - continuing without cache');
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();

export { io };
