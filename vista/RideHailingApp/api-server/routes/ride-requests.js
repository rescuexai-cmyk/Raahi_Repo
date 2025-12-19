const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Create ride request
router.post('/', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Ride request created (stub)'
  });
});

// Accept ride request
router.post('/:id/accept', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Ride request accepted (stub)'
  });
});

// Reject ride request
router.post('/:id/reject', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Ride request rejected (stub)'
  });
});

module.exports = router;