require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();

// In-memory storage for demo (replace with database in production)
const mockDatabase = {
  users: new Map(),
  drivers: new Map(),
  rides: new Map(),
  sessions: new Map()
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'exp://localhost:19000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Mock OTP service
const otpService = {
  sessions: new Map(),
  
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  
  createSession(phone) {
    const sessionId = uuidv4();
    const otp = this.generateOTP();
    
    this.sessions.set(sessionId, {
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0
    });
    
    console.log(`📱 OTP for ${phone}: ${otp} (Session: ${sessionId})`);
    return { sessionId, otp };
  },
  
  verifyOTP(sessionId, otp) {
    const session = this.sessions.get(sessionId);
    
    if (!session || new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { success: false, error: 'Session expired' };
    }
    
    if (session.attempts >= 3) {
      this.sessions.delete(sessionId);
      return { success: false, error: 'Too many attempts' };
    }
    
    session.attempts++;
    
    if (session.otp !== otp) {
      return { success: false, error: 'Invalid OTP' };
    }
    
    this.sessions.delete(sessionId);
    return { success: true, phone: session.phone };
  }
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'demo-secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'mock (in-memory)'
  });
});

// Authentication routes
app.post('/api/auth/request-otp', (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required'
    });
  }

  const { sessionId } = otpService.createSession(phone);

  res.json({
    success: true,
    sessionId,
    message: 'OTP sent successfully'
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { sessionId, otp, userData } = req.body;
  
  if (!sessionId || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Session ID and OTP are required'
    });
  }

  const verification = otpService.verifyOTP(sessionId, otp);

  if (!verification.success) {
    return res.status(400).json(verification);
  }

  const phone = verification.phone;
  let user = Array.from(mockDatabase.users.values()).find(u => u.phone === phone);

  if (!user) {
    // Create new user
    const userId = uuidv4();
    user = {
      id: userId,
      phone,
      name: userData?.name || 'User',
      email: userData?.email || '',
      user_type: userData?.user_type || 'rider',
      avatar_url: null,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDatabase.users.set(userId, user);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, userType: user.user_type },
    process.env.JWT_SECRET || 'demo-secret',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    user: {
      ...user,
      user_metadata: {
        avatar_url: user.avatar_url,
        name: user.name,
        user_type: user.user_type
      }
    },
    token
  });
});

app.post('/api/auth/signout', (req, res) => {
  res.json({
    success: true,
    message: 'Signed out successfully'
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = mockDatabase.users.get(req.user.userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    user: {
      ...user,
      user_metadata: {
        avatar_url: user.avatar_url,
        name: user.name,
        user_type: user.user_type
      }
    }
  });
});

// Driver routes
app.get('/api/drivers/nearby', (req, res) => {
  const { lat, lng } = req.query;
  
  // Mock nearby drivers
  const mockDrivers = [
    {
      id: uuidv4(),
      name: 'John Driver',
      phone: '+1234567890',
      email: 'john@example.com',
      rating: 4.8,
      status: 'available',
      total_rides: 250,
      is_verified: true,
      is_available: true,
      license_number: 'DL123456',
      vehicle_info: {
        type: 'economy',
        model: 'Toyota Camry',
        color: 'White',
        plateNumber: 'ABC123'
      },
      current_location: {
        lat: parseFloat(lat) + 0.001,
        lng: parseFloat(lng) + 0.001
      },
      user_type: 'driver',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Sarah Driver',
      phone: '+1234567891',
      email: 'sarah@example.com',
      rating: 4.9,
      status: 'available',
      total_rides: 180,
      is_verified: true,
      is_available: true,
      license_number: 'DL654321',
      vehicle_info: {
        type: 'economy',
        model: 'Honda Civic',
        color: 'Blue',
        plateNumber: 'XYZ789'
      },
      current_location: {
        lat: parseFloat(lat) - 0.001,
        lng: parseFloat(lng) - 0.001
      },
      user_type: 'driver',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    drivers: mockDrivers,
    count: mockDrivers.length
  });
});

app.get('/api/drivers/:id', (req, res) => {
  res.json({
    success: true,
    driver: {
      id: req.params.id,
      name: 'Mock Driver',
      phone: '+1234567890',
      rating: 4.8,
      status: 'available',
      vehicle_info: { type: 'economy', model: 'Toyota Camry' },
      current_location: { lat: 37.7749, lng: -122.4194 }
    }
  });
});

app.put('/api/drivers/:id/location', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Location updated successfully'
  });
});

app.put('/api/drivers/:id/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Status updated successfully',
    status: req.body.status,
    is_available: req.body.status === 'available'
  });
});

// User routes
app.get('/api/users/me', authenticateToken, (req, res) => {
  const user = mockDatabase.users.get(req.user.userId);
  res.json({
    success: true,
    user: user || { id: req.user.userId, name: 'Mock User' }
  });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: { id: req.params.id, ...req.body }
  });
});

// Ride routes
app.post('/api/rides', authenticateToken, (req, res) => {
  const rideId = uuidv4();
  const ride = {
    id: rideId,
    rider_id: req.user.userId,
    ...req.body,
    status: 'requested',
    created_at: new Date().toISOString()
  };
  
  mockDatabase.rides.set(rideId, ride);
  
  res.json({
    success: true,
    ride
  });
});

app.get('/api/rides/:id', authenticateToken, (req, res) => {
  const ride = mockDatabase.rides.get(req.params.id);
  res.json({
    success: true,
    ride: ride || { id: req.params.id, status: 'mock' }
  });
});

app.put('/api/rides/:id/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    ride: { id: req.params.id, status: req.body.status }
  });
});

app.get('/api/rides/users/:userId/rides', authenticateToken, (req, res) => {
  res.json({
    success: true,
    rides: Array.from(mockDatabase.rides.values()).filter(r => r.rider_id === req.params.userId)
  });
});

// Stub routes
app.post('/api/ride-requests', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Ride request created (mock)' });
});

app.post('/api/ride-requests/:id/accept', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Ride request accepted (mock)' });
});

app.post('/api/ride-requests/:id/reject', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Ride request rejected (mock)' });
});

app.post('/api/payments', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Payment created (mock)' });
});

app.post('/api/payments/:id/process', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Payment processed (mock)' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock Ride Hailing API Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}/health`);
  console.log(`📱 Ready for mobile app integration!`);
  console.log(`\n✨ DEMO MODE: Using in-memory storage (no database required)`);
  console.log(`📋 See BACKEND_SETUP.md for full PostgreSQL setup`);
});

module.exports = app;