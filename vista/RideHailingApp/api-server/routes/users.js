const express = require('express');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
        user_metadata: {
          avatar_url: user.avatar_url,
          name: user.name,
          user_type: user.user_type
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar_url } = req.body;

    if (req.user.userId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const db = req.app.locals.db;
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, avatar_url = $3 WHERE id = $4 RETURNING *',
      [name, email, avatar_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

module.exports = router;