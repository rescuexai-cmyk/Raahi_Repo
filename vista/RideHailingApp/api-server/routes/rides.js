const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Create ride
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pickup_location, destination_location, ride_type, payment_method, fare, distance, estimated_duration } = req.body;
    const db = req.app.locals.db;

    const result = await db.query(
      `INSERT INTO rides (rider_id, pickup_location, destination_location, ride_type, payment_method, fare, distance, estimated_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.userId, JSON.stringify(pickup_location), JSON.stringify(destination_location), ride_type, payment_method, fare, distance, estimated_duration]
    );

    res.json({
      success: true,
      ride: result.rows[0]
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ride'
    });
  }
});

// Get ride by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const result = await db.query('SELECT * FROM rides WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    res.json({
      success: true,
      ride: result.rows[0]
    });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ride'
    });
  }
});

// Update ride status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = req.app.locals.db;

    const result = await db.query(
      'UPDATE rides SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    res.json({
      success: true,
      ride: result.rows[0]
    });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ride status'
    });
  }
});

// Get user rides
router.get('/users/:userId/rides', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db;

    const result = await db.query(
      'SELECT * FROM rides WHERE rider_id = $1 OR driver_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      rides: result.rows
    });
  } catch (error) {
    console.error('Get user rides error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rides'
    });
  }
});

module.exports = router;