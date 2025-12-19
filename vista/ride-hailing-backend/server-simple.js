const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ride-hailing-secret-key-dev';

// ============================================
// IN-MEMORY DATABASE
// ============================================
const db = {
  users: new Map(),
  drivers: new Map(),
  rides: new Map(),
  otpSessions: new Map(),
  driverLocations: new Map(),
};

// Seed some demo drivers
const seedDrivers = () => {
  const demoDrivers = [
    {
      id: 'driver-1',
      name: 'Rajesh Kumar',
      phone: '+919876543210',
      email: 'rajesh@driver.com',
      userType: 'driver',
      vehicleType: 'economy',
      vehicleNumber: 'DL 01 AB 1234',
      vehicleModel: 'Maruti Swift',
      vehicleColor: 'White',
      rating: 4.8,
      totalRides: 1250,
      status: 'online',
      isAvailable: true,
      location: { lat: 28.6139, lng: 77.2090 }, // Delhi
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'driver-2',
      name: 'Amit Singh',
      phone: '+919876543211',
      email: 'amit@driver.com',
      userType: 'driver',
      vehicleType: 'comfort',
      vehicleNumber: 'DL 02 CD 5678',
      vehicleModel: 'Honda City',
      vehicleColor: 'Silver',
      rating: 4.9,
      totalRides: 890,
      status: 'online',
      isAvailable: true,
      location: { lat: 28.6145, lng: 77.2085 },
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'driver-3',
      name: 'Suresh Sharma',
      phone: '+919876543212',
      email: 'suresh@driver.com',
      userType: 'driver',
      vehicleType: 'premium',
      vehicleNumber: 'DL 03 EF 9012',
      vehicleModel: 'BMW 3 Series',
      vehicleColor: 'Black',
      rating: 4.95,
      totalRides: 560,
      status: 'online',
      isAvailable: true,
      location: { lat: 28.6150, lng: 77.2100 },
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'driver-4',
      name: 'Vikram Patel',
      phone: '+919876543213',
      email: 'vikram@driver.com',
      userType: 'driver',
      vehicleType: 'bike',
      vehicleNumber: 'DL 04 GH 3456',
      vehicleModel: 'Honda Activa',
      rating: 4.7,
      totalRides: 2100,
      status: 'online',
      isAvailable: true,
      location: { lat: 28.6135, lng: 77.2095 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'driver-5',
      name: 'Pradeep Yadav',
      phone: '+919876543214',
      email: 'pradeep@driver.com',
      userType: 'driver',
      vehicleType: 'xl',
      vehicleNumber: 'DL 05 IJ 7890',
      vehicleModel: 'Toyota Innova',
      rating: 4.85,
      totalRides: 750,
      status: 'online',
      isAvailable: true,
      location: { lat: 28.6142, lng: 77.2088 },
      createdAt: new Date().toISOString(),
    },
  ];

  demoDrivers.forEach(driver => {
    db.drivers.set(driver.id, driver);
    db.driverLocations.set(driver.id, driver.location);
  });

  console.log(`✅ Seeded ${demoDrivers.length} demo drivers`);
};

seedDrivers();

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'in-memory',
  });
});

app.get('/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'in-memory',
    stats: {
      users: db.users.size,
      drivers: db.drivers.size,
      rides: db.rides.size,
      activeSessions: db.otpSessions.size,
    },
  });
});

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/request-otp', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number required' });
  }

  // Generate OTP session
  const sessionId = uuidv4();
  const otp = '123456'; // Demo OTP - always 123456
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  db.otpSessions.set(sessionId, {
    phone,
    otp,
    expiresAt,
    verified: false,
  });

  console.log(`📱 OTP for ${phone}: ${otp} (Session: ${sessionId})`);

  // Check if user exists
  let existingUser = null;
  for (const [id, user] of db.users) {
    if (user.phone === phone) {
      existingUser = user;
      break;
    }
  }

  res.json({
    success: true,
    sessionId,
    expiresIn: 300,
    message: 'OTP sent successfully',
    isNewUser: !existingUser,
    // For demo purposes, include OTP in response
    demoOtp: otp,
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { sessionId, otp, userData } = req.body;

  if (!sessionId || !otp) {
    return res.status(400).json({ success: false, error: 'Session ID and OTP required' });
  }

  const session = db.otpSessions.get(sessionId);

  if (!session) {
    return res.status(400).json({ success: false, error: 'Invalid session' });
  }

  if (new Date() > new Date(session.expiresAt)) {
    db.otpSessions.delete(sessionId);
    return res.status(400).json({ success: false, error: 'OTP expired' });
  }

  if (session.otp !== otp) {
    return res.status(400).json({ success: false, error: 'Invalid OTP' });
  }

  // Mark session as verified
  session.verified = true;
  db.otpSessions.delete(sessionId);

  // Find or create user
  let user = null;
  for (const [id, u] of db.users) {
    if (u.phone === session.phone) {
      user = u;
      break;
    }
  }

  if (!user) {
    // Create new user
    user = {
      id: uuidv4(),
      phone: session.phone,
      name: userData?.name || 'User',
      email: userData?.email || null,
      userType: userData?.user_type || 'rider',
      avatarUrl: null,
      rating: 5.0,
      totalRides: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.set(user.id, user);
    console.log(`👤 New user created: ${user.id}`);
  } else {
    // Update existing user
    if (userData?.name) user.name = userData.name;
    if (userData?.email) user.email = userData.email;
    user.updatedAt = new Date().toISOString();
    db.users.set(user.id, user);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    user,
    message: 'Login successful',
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.users.get(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, user });
});

// ============================================
// USER ROUTES
// ============================================
app.get('/api/users/profile', authMiddleware, (req, res) => {
  const user = db.users.get(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, user });
});

app.put('/api/users/profile', authMiddleware, (req, res) => {
  const user = db.users.get(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const { name, email, avatarUrl } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();

  db.users.set(user.id, user);

  res.json({ success: true, user });
});

app.post('/api/users/location', authMiddleware, (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Location required' });
  }

  // Store user location (for riders, mainly for analytics)
  const user = db.users.get(req.user.userId);
  if (user) {
    user.lastLocation = { lat, lng };
    user.lastLocationUpdate = new Date().toISOString();
    db.users.set(user.id, user);
  }

  res.json({ success: true, message: 'Location updated' });
});

// ============================================
// DRIVER ROUTES
// ============================================
app.get('/api/drivers/nearby', (req, res) => {
  const { lat, lng, radius = 5000, vehicleType } = req.query;

  const latitude = parseFloat(lat) || 28.6139;
  const longitude = parseFloat(lng) || 77.2090;
  const searchRadius = parseInt(radius) || 5000;

  const nearbyDrivers = [];

  for (const [id, driver] of db.drivers) {
    if (!driver.isAvailable || driver.status !== 'online') continue;
    if (vehicleType && driver.vehicleType !== vehicleType) continue;

    const driverLoc = db.driverLocations.get(id) || driver.location;
    if (!driverLoc) continue;

    // Calculate distance (simplified)
    const distance = calculateDistance(latitude, longitude, driverLoc.lat, driverLoc.lng);

    if (distance <= searchRadius) {
      nearbyDrivers.push({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        vehicleModel: driver.vehicleModel,
        rating: driver.rating,
        totalRides: driver.totalRides,
        location: driverLoc,
        distance: Math.round(distance),
        eta: Math.ceil(distance / 500), // Rough ETA in minutes
      });
    }
  }

  // Sort by distance
  nearbyDrivers.sort((a, b) => a.distance - b.distance);

  res.json({
    success: true,
    drivers: nearbyDrivers,
    count: nearbyDrivers.length,
  });
});

app.get('/api/drivers/profile', authMiddleware, (req, res) => {
  const driver = db.drivers.get(req.user.userId);

  if (!driver) {
    return res.status(404).json({ success: false, error: 'Driver not found' });
  }

  res.json({ success: true, driver });
});

app.post('/api/drivers/status', authMiddleware, (req, res) => {
  const { status, isAvailable } = req.body;

  let driver = db.drivers.get(req.user.userId);

  if (!driver) {
    return res.status(404).json({ success: false, error: 'Driver not found' });
  }

  if (status) driver.status = status;
  if (typeof isAvailable === 'boolean') driver.isAvailable = isAvailable;
  driver.updatedAt = new Date().toISOString();

  db.drivers.set(driver.id, driver);

  res.json({ success: true, driver });
});

app.post('/api/drivers/location', authMiddleware, (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Location required' });
  }

  const driver = db.drivers.get(req.user.userId);

  if (!driver) {
    return res.status(404).json({ success: false, error: 'Driver not found' });
  }

  db.driverLocations.set(driver.id, { lat, lng });
  driver.location = { lat, lng };
  driver.lastLocationUpdate = new Date().toISOString();
  db.drivers.set(driver.id, driver);

  // Broadcast to WebSocket clients
  broadcastDriverLocation(driver.id, { lat, lng });

  res.json({ success: true, message: 'Location updated' });
});

// ============================================
// RIDE ROUTES
// ============================================
app.post('/api/rides/request', authMiddleware, (req, res) => {
  const {
    pickupLocation,
    destinationLocation,
    pickupAddress,
    destinationAddress,
    rideType,
    fare,
    distance,
    duration,
  } = req.body;

  if (!pickupLocation || !destinationLocation) {
    return res.status(400).json({ success: false, error: 'Pickup and destination required' });
  }

  const user = db.users.get(req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Create ride
  const ride = {
    id: uuidv4(),
    riderId: user.id,
    riderName: user.name,
    riderPhone: user.phone,
    driverId: null,
    driverName: null,
    driverPhone: null,
    vehicleNumber: null,
    vehicleModel: null,
    pickupLocation,
    destinationLocation,
    pickupAddress: pickupAddress || 'Pickup Location',
    destinationAddress: destinationAddress || 'Destination',
    rideType: rideType || 'economy',
    status: 'requested',
    fare: fare || 0,
    distance: distance || 0,
    duration: duration || 0,
    rating: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  db.rides.set(ride.id, ride);

  console.log(`🚗 New ride requested: ${ride.id}`);

  // Simulate driver matching after a delay
  setTimeout(() => {
    matchDriverToRide(ride.id);
  }, 3000 + Math.random() * 5000); // 3-8 seconds

  res.json({
    success: true,
    ride,
    message: 'Ride requested successfully',
  });
});

app.get('/api/rides/:id', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  // Check if user is authorized to view this ride
  if (ride.riderId !== req.user.userId && ride.driverId !== req.user.userId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  res.json({ success: true, ride });
});

app.get('/api/rides', authMiddleware, (req, res) => {
  const userRides = [];

  for (const [id, ride] of db.rides) {
    if (ride.riderId === req.user.userId || ride.driverId === req.user.userId) {
      userRides.push(ride);
    }
  }

  // Sort by date, newest first
  userRides.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, rides: userRides });
});

app.put('/api/rides/:id/accept', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (ride.status !== 'requested') {
    return res.status(400).json({ success: false, error: 'Ride cannot be accepted' });
  }

  const driver = db.drivers.get(req.user.userId);
  if (!driver) {
    return res.status(403).json({ success: false, error: 'Only drivers can accept rides' });
  }

  ride.status = 'accepted';
  ride.driverId = driver.id;
  ride.driverName = driver.name;
  ride.driverPhone = driver.phone;
  ride.vehicleNumber = driver.vehicleNumber;
  ride.vehicleModel = driver.vehicleModel;
  ride.acceptedAt = new Date().toISOString();
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);
  driver.isAvailable = false;
  db.drivers.set(driver.id, driver);

  // Broadcast to WebSocket
  broadcastRideUpdate(ride);

  res.json({ success: true, ride });
});

app.put('/api/rides/:id/arriving', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (ride.status !== 'accepted') {
    return res.status(400).json({ success: false, error: 'Invalid ride status' });
  }

  ride.status = 'arriving';
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);
  broadcastRideUpdate(ride);

  res.json({ success: true, ride });
});

app.put('/api/rides/:id/start', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (ride.status !== 'arriving' && ride.status !== 'accepted') {
    return res.status(400).json({ success: false, error: 'Invalid ride status' });
  }

  ride.status = 'in_progress';
  ride.startedAt = new Date().toISOString();
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);
  broadcastRideUpdate(ride);

  res.json({ success: true, ride });
});

app.put('/api/rides/:id/complete', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (ride.status !== 'in_progress') {
    return res.status(400).json({ success: false, error: 'Ride not in progress' });
  }

  ride.status = 'completed';
  ride.completedAt = new Date().toISOString();
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);

  // Make driver available again
  if (ride.driverId) {
    const driver = db.drivers.get(ride.driverId);
    if (driver) {
      driver.isAvailable = true;
      driver.totalRides += 1;
      db.drivers.set(driver.id, driver);
    }
  }

  // Update rider stats
  const rider = db.users.get(ride.riderId);
  if (rider) {
    rider.totalRides += 1;
    db.users.set(rider.id, rider);
  }

  broadcastRideUpdate(ride);

  res.json({ success: true, ride });
});

app.put('/api/rides/:id/cancel', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (['completed', 'cancelled'].includes(ride.status)) {
    return res.status(400).json({ success: false, error: 'Ride cannot be cancelled' });
  }

  const { reason } = req.body;

  ride.status = 'cancelled';
  ride.cancelledAt = new Date().toISOString();
  ride.cancellationReason = reason || 'User cancelled';
  ride.cancelledBy = req.user.userId;
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);

  // Make driver available again
  if (ride.driverId) {
    const driver = db.drivers.get(ride.driverId);
    if (driver) {
      driver.isAvailable = true;
      db.drivers.set(driver.id, driver);
    }
  }

  broadcastRideUpdate(ride);

  res.json({ success: true, ride, message: 'Ride cancelled' });
});

app.post('/api/rides/:id/rate', authMiddleware, (req, res) => {
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    return res.status(404).json({ success: false, error: 'Ride not found' });
  }

  if (ride.status !== 'completed') {
    return res.status(400).json({ success: false, error: 'Can only rate completed rides' });
  }

  const { rating, feedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
  }

  ride.rating = rating;
  ride.feedback = feedback || null;
  ride.updatedAt = new Date().toISOString();

  db.rides.set(ride.id, ride);

  // Update driver rating
  if (ride.driverId) {
    const driver = db.drivers.get(ride.driverId);
    if (driver) {
      // Simple average calculation
      const totalRating = driver.rating * (driver.totalRides - 1) + rating;
      driver.rating = Math.round((totalRating / driver.totalRides) * 100) / 100;
      db.drivers.set(driver.id, driver);
    }
  }

  res.json({ success: true, ride });
});

// ============================================
// MAPS ROUTES
// ============================================
app.get('/api/maps/directions', (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, error: 'Origin and destination required' });
  }

  // Parse coordinates
  const [originLat, originLng] = origin.split(',').map(parseFloat);
  const [destLat, destLng] = destination.split(',').map(parseFloat);

  // Calculate distance
  const distance = calculateDistance(originLat, originLng, destLat, destLng);
  const duration = Math.ceil(distance / 500); // ~30 km/h average speed

  res.json({
    success: true,
    route: {
      distance: Math.round(distance),
      duration: duration,
      polyline: generateSimplePolyline(originLat, originLng, destLat, destLng),
    },
  });
});

app.post('/api/maps/fare-estimate', (req, res) => {
  const { pickupLocation, destinationLocation, rideType } = req.body;

  if (!pickupLocation || !destinationLocation) {
    return res.status(400).json({ success: false, error: 'Locations required' });
  }

  const distance = calculateDistance(
    pickupLocation.lat,
    pickupLocation.lng,
    destinationLocation.lat,
    destinationLocation.lng
  );

  const distanceKm = distance / 1000;
  const durationMin = Math.ceil(distance / 500);

  // Calculate fare based on ride type
  const fareRates = {
    bike: { base: 20, perKm: 8, perMin: 1 },
    economy: { base: 40, perKm: 12, perMin: 1.5 },
    comfort: { base: 60, perKm: 16, perMin: 2 },
    premium: { base: 100, perKm: 25, perMin: 3 },
    xl: { base: 80, perKm: 20, perMin: 2.5 },
  };

  const rate = fareRates[rideType] || fareRates.economy;
  const baseFare = rate.base;
  const distanceFare = distanceKm * rate.perKm;
  const timeFare = durationMin * rate.perMin;
  const subtotal = baseFare + distanceFare + timeFare;
  const taxes = subtotal * 0.05; // 5% tax
  const total = subtotal + taxes;

  res.json({
    success: true,
    fareEstimate: {
      rideType: rideType || 'economy',
      baseFare: Math.round(baseFare),
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      subtotal: Math.round(subtotal),
      taxes: Math.round(taxes),
      total: Math.round(total),
      currency: 'INR',
      estimatedDistance: Math.round(distanceKm * 10) / 10,
      estimatedDuration: durationMin,
      distance: Math.round(distance),
      estimatedTime: durationMin,
    },
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function generateSimplePolyline(lat1, lng1, lat2, lng2) {
  // Generate a simple polyline with intermediate points
  const points = [];
  const steps = 10;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t,
    });
  }

  return points;
}

function matchDriverToRide(rideId) {
  const ride = db.rides.get(rideId);
  if (!ride || ride.status !== 'requested') return;

  // Find nearest available driver
  let nearestDriver = null;
  let minDistance = Infinity;

  for (const [id, driver] of db.drivers) {
    if (!driver.isAvailable || driver.status !== 'online') continue;

    // Match by vehicle type if specified
    if (ride.rideType && ride.rideType !== 'any') {
      const typeMatch = {
        bike: ['bike'],
        economy: ['economy', 'comfort', 'premium'],
        comfort: ['comfort', 'premium'],
        premium: ['premium'],
        xl: ['xl'],
      };
      if (!typeMatch[ride.rideType]?.includes(driver.vehicleType)) continue;
    }

    const driverLoc = db.driverLocations.get(id) || driver.location;
    if (!driverLoc) continue;

    const distance = calculateDistance(
      ride.pickupLocation.lat,
      ride.pickupLocation.lng,
      driverLoc.lat,
      driverLoc.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestDriver = driver;
    }
  }

  if (nearestDriver) {
    // Generate 4-digit OTP for ride verification
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Auto-accept for demo
    ride.status = 'accepted';
    ride.driverId = nearestDriver.id;
    ride.driverName = nearestDriver.name;
    ride.driverPhone = nearestDriver.phone;
    ride.vehicleNumber = nearestDriver.vehicleNumber;
    ride.vehicleModel = nearestDriver.vehicleModel;
    ride.vehicleType = nearestDriver.vehicleType;
    ride.vehicleColor = nearestDriver.vehicleColor || 'White';
    ride.driverRating = nearestDriver.rating?.toString() || '4.8';
    ride.driverAvatarUrl = nearestDriver.avatarUrl;
    ride.otp = otp; // OTP for ride verification
    ride.acceptedAt = new Date().toISOString();
    ride.updatedAt = new Date().toISOString();
    ride.eta = Math.ceil(minDistance / 500); // ETA in minutes
    
    console.log(`🔐 Ride ${rideId} OTP: ${otp}`);

    db.rides.set(ride.id, ride);
    nearestDriver.isAvailable = false;
    db.drivers.set(nearestDriver.id, nearestDriver);

    console.log(`✅ Driver ${nearestDriver.name} matched to ride ${ride.id}`);

    // Broadcast to WebSocket
    broadcastRideUpdate(ride);

    // Simulate driver arriving after ETA
    setTimeout(() => {
      simulateDriverArriving(ride.id);
    }, (ride.eta * 1000) + 2000); // ETA + buffer
  } else {
    console.log(`⚠️ No available drivers for ride ${ride.id}`);
  }
}

function simulateDriverArriving(rideId) {
  const ride = db.rides.get(rideId);
  if (!ride || ride.status !== 'accepted') return;

  ride.status = 'arriving';
  ride.updatedAt = new Date().toISOString();
  db.rides.set(ride.id, ride);

  console.log(`🚗 Driver arriving for ride ${ride.id}`);
  broadcastRideUpdate(ride);
}

// ============================================
// WEBSOCKET
// ============================================
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  wsClients.set(clientId, { ws, userId: null, type: null });

  console.log(`🔌 WebSocket client connected: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'auth') {
        // Authenticate WebSocket connection
        try {
          const decoded = jwt.verify(data.token, JWT_SECRET);
          const client = wsClients.get(clientId);
          client.userId = decoded.userId;
          client.userType = decoded.userType;

          ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.userId }));
        } catch (error) {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
        }
      }

      if (data.type === 'subscribe_ride') {
        const client = wsClients.get(clientId);
        client.rideId = data.rideId;
      }

      if (data.type === 'driver_location') {
        // Update driver location
        const client = wsClients.get(clientId);
        if (client.userId && client.userType === 'driver') {
          db.driverLocations.set(client.userId, data.location);
          broadcastDriverLocation(client.userId, data.location);
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log(`🔌 WebSocket client disconnected: ${clientId}`);
  });
});

function broadcastRideUpdate(ride) {
  const message = JSON.stringify({
    type: 'ride_update',
    ride,
  });

  for (const [id, client] of wsClients) {
    if (
      client.ws.readyState === WebSocket.OPEN &&
      (client.userId === ride.riderId ||
        client.userId === ride.driverId ||
        client.rideId === ride.id)
    ) {
      client.ws.send(message);
    }
  }
}

function broadcastDriverLocation(driverId, location) {
  const message = JSON.stringify({
    type: 'driver_location',
    driverId,
    location,
  });

  // Find rides where this driver is assigned
  for (const [rideId, ride] of db.rides) {
    if (ride.driverId === driverId && !['completed', 'cancelled'].includes(ride.status)) {
      // Send to rider
      for (const [id, client] of wsClients) {
        if (client.ws.readyState === WebSocket.OPEN && client.userId === ride.riderId) {
          client.ws.send(message);
        }
      }
    }
  }
}

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════');
  console.log(`🚗 Ride Hailing Backend API`);
  console.log(`📍 Running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket at ws://localhost:${PORT}/ws`);
  console.log('📦 Using in-memory database (data resets on restart)');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST /api/auth/request-otp');
  console.log('   POST /api/auth/verify-otp');
  console.log('   GET  /api/auth/me');
  console.log('   GET  /api/drivers/nearby');
  console.log('   POST /api/rides/request');
  console.log('   GET  /api/rides/:id');
  console.log('   PUT  /api/rides/:id/cancel');
  console.log('   POST /api/maps/fare-estimate');
  console.log('');
  console.log('💡 Demo OTP: 123456 (works for any phone number)');
  console.log('🚀 ═══════════════════════════════════════════════════');
  console.log('');
});

