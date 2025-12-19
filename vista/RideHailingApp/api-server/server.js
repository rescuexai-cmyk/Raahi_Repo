require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');
const rideRoutes = require('./routes/rides');
const rideRequestRoutes = require('./routes/ride-requests');
const paymentRoutes = require('./routes/payments');

// WebSocket setup
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ridehailing',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Make pool available to routes
app.locals.db = pool;
app.locals.wss = wss;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'exp://localhost:19000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/payments', paymentRoutes);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  // Store user ID on connection (you'll extract this from token)
  ws.userId = null;
  ws.userType = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'authenticate':
      // Handle authentication
      ws.userId = data.userId;
      ws.userType = data.userType;
      ws.send(JSON.stringify({ type: 'authenticated', success: true }));
      break;
      
    case 'location_update':
      // Broadcast location updates to relevant users
      if (ws.userType === 'driver') {
        broadcastToRiders(data);
      }
      break;
      
    case 'ride_request':
      // Handle ride requests
      broadcastToDrivers(data);
      break;
      
    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
}

function broadcastToRiders(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.userType === 'rider') {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToDrivers(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.userType === 'driver') {
      client.send(JSON.stringify(data));
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    // Run database setup if needed
    const setupDb = require('./scripts/setup-database');
    await setupDb(pool);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Ride Hailing API Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

module.exports = app;