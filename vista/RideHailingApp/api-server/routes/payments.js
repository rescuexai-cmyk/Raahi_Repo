const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Create payment
router.post('/', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Payment created (stub)'
  });
});

// Process payment
router.post('/:id/process', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Payment processed (stub)'
  });
});

module.exports = router;