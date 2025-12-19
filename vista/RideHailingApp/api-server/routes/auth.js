const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Mock OTP service - replace with real SMS service
const otpService = {
  sessions: new Map(),
  
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  
  createSession(phone) {
    const sessionId = require('uuid').v4();
    const otp = this.generateOTP();
    
    this.sessions.set(sessionId, {
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0
    });
    
    // In production, send SMS here
    console.log(`OTP for ${phone}: ${otp} (Session: ${sessionId})`);
    
    return { sessionId, otp }; // Remove otp from return in production
  },
  
  verifyOTP(sessionId, otp) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Invalid session' };
    }
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { success: false, error: 'OTP expired' };
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

// Request OTP
router.post('/request-otp', [
  body('phone').isMobilePhone().withMessage('Valid phone number is required')
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

    const { phone } = req.body;
    const { sessionId } = otpService.createSession(phone);

    res.json({
      success: true,
      sessionId,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
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

    const { sessionId, otp, userData } = req.body;
    const verification = otpService.verifyOTP(sessionId, otp);

    if (!verification.success) {
      return res.status(400).json(verification);
    }

    const db = req.app.locals.db;
    const phone = verification.phone;

    // Check if user exists
    let userQuery = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user;

    if (userQuery.rows.length === 0) {
      // Create new user
      if (!userData) {
        return res.status(400).json({
          success: false,
          error: 'User data required for new registration'
        });
      }

      const insertResult = await db.query(
        `INSERT INTO users (phone, name, email, user_type, is_verified) 
         VALUES ($1, $2, $3, $4, true) 
         RETURNING *`,
        [phone, userData.name, userData.email, userData.user_type || 'rider']
      );
      user = insertResult.rows[0];
    } else {
      user = userQuery.rows[0];
      
      // Update verification status
      await db.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
      },
      token
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    // In a real app, you might invalidate the token in a blacklist
    res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign out'
    });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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

// Get current user (protected route)
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
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;