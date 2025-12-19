const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get nearby drivers
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const db = req.app.locals.db;
    
    // Query for nearby drivers using PostGIS
    const query = `
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.email,
        d.rating,
        d.status,
        d.total_rides,
        d.is_verified,
        d.is_available,
        d.license_number,
        d.vehicle_info,
        ST_AsGeoJSON(d.current_location)::json as current_location,
        ST_Distance(
          d.current_location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM drivers d
      JOIN users u ON d.id = u.id
      WHERE d.is_available = true 
        AND d.status = 'available'
        AND ST_DWithin(
          d.current_location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distance
      LIMIT 20
    `;

    const result = await db.query(query, [parseFloat(lng), parseFloat(lat), parseFloat(radius)]);

    const drivers = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      rating: parseFloat(row.rating) || 5.0,
      status: row.status,
      total_rides: row.total_rides || 0,
      is_verified: row.is_verified,
      is_available: row.is_available,
      license_number: row.license_number,
      vehicle_info: row.vehicle_info || {},
      current_location: row.current_location ? {
        lat: row.current_location.coordinates[1],
        lng: row.current_location.coordinates[0]
      } : null,
      user_type: 'driver',
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      success: true,
      drivers,
      count: drivers.length
    });

  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nearby drivers'
    });
  }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const query = `
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.email,
        u.avatar_url,
        d.rating,
        d.status,
        d.total_rides,
        d.is_verified,
        d.is_available,
        d.license_number,
        d.vehicle_info,
        ST_AsGeoJSON(d.current_location)::json as current_location,
        u.created_at,
        u.updated_at
      FROM drivers d
      JOIN users u ON d.id = u.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    const row = result.rows[0];
    const driver = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      avatar: row.avatar_url,
      rating: parseFloat(row.rating) || 5.0,
      status: row.status,
      total_rides: row.total_rides || 0,
      is_verified: row.is_verified,
      is_available: row.is_available,
      license_number: row.license_number,
      vehicle_info: row.vehicle_info || {},
      current_location: row.current_location ? {
        lat: row.current_location.coordinates[1],
        lng: row.current_location.coordinates[0]
      } : null,
      user_type: 'driver',
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    res.json({
      success: true,
      driver
    });

  } catch (error) {
    console.error('Get driver by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get driver'
    });
  }
});

// Update driver location (protected)
router.put('/:id/location', authenticateToken, [
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { location, heading } = req.body;

    // Verify user owns this driver profile
    if (req.user.userId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const db = req.app.locals.db;

    // Update driver location
    const query = `
      UPDATE drivers 
      SET 
        current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `;

    const result = await db.query(query, [location.lng, location.lat, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Broadcast location update via WebSocket
    const wss = req.app.locals.wss;
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'driver_location_update',
          driverId: id,
          location,
          heading,
          timestamp: new Date().toISOString()
        }));
      }
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
});

// Update driver status (protected)
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['available', 'busy', 'offline', 'on_ride']).withMessage('Valid status required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Verify user owns this driver profile
    if (req.user.userId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const db = req.app.locals.db;

    // Update driver status and availability
    const query = `
      UPDATE drivers 
      SET 
        status = $1,
        is_available = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, status, is_available
    `;

    const isAvailable = status === 'available';
    const result = await db.query(query, [status, isAvailable, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      status: result.rows[0].status,
      is_available: result.rows[0].is_available
    });

  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// Register as driver (protected)
router.post('/register', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('vehicleModel').notEmpty().withMessage('Vehicle model is required'),
  body('vehicleColor').notEmpty().withMessage('Vehicle color is required'),
  body('licenseNumber').notEmpty().withMessage('License number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      phone,
      address,
      vehicleNumber,
      vehicleType,
      vehicleModel,
      vehicleColor,
      licenseNumber
    } = req.body;

    const db = req.app.locals.db;
    const userId = req.user.userId;

    // Check if user is already a driver
    const existingDriver = await db.query('SELECT id FROM drivers WHERE id = $1', [userId]);
    if (existingDriver.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already registered as a driver'
      });
    }

    // Create driver profile
    const vehicleInfo = {
      type: vehicleType,
      model: vehicleModel,
      color: vehicleColor,
      plateNumber: vehicleNumber
    };

    const insertQuery = `
      INSERT INTO drivers (
        id, license_number, is_verified, is_available, rating, 
        total_rides, vehicle_info, status
      ) VALUES ($1, $2, false, false, 5.0, 0, $3, 'offline')
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      userId,
      licenseNumber,
      JSON.stringify(vehicleInfo)
    ]);

    // Update user type
    await db.query(
      'UPDATE users SET user_type = $1 WHERE id = $2',
      ['driver', userId]
    );

    const driver = result.rows[0];
    res.json({
      success: true,
      driver: {
        id: driver.id,
        license_number: driver.license_number,
        is_verified: driver.is_verified,
        is_available: driver.is_available,
        rating: driver.rating,
        total_rides: driver.total_rides,
        vehicle_info: driver.vehicle_info,
        status: driver.status,
        user_type: 'driver'
      },
      message: 'Driver registration successful'
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register driver'
    });
  }
});

module.exports = router;