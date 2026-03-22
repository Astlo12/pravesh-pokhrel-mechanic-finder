const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/emailService');
const { ObjectId } = require('../config/database');
const { body, validationResult } = require('express-validator');
const { onMechanicRegistered } = require('../utils/notify');
const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('user_type').isIn(['customer', 'mechanic'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone, user_type } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = await User.create({
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      user_type
    });

    // If mechanic, create mechanic profile
    if (user_type === 'mechanic') {
      await Mechanic.create({
        user_id: userId,
        is_verified: false,
      });
      try {
        await onMechanicRegistered(name, email);
      } catch (notifyErr) {
        console.error('Mechanic register notify error:', notifyErr);
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: userId.toString(), email, user_type },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    // Get user with profile picture
    const newUser = await User.findById(userId);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId.toString(),
        email,
        name,
        user_type,
        profile_picture: newUser.profile_picture || null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        user_type: user.user_type,
        profile_picture: user.profile_picture || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);

    // Don't reveal if user exists for security
    // Always return success message
    if (user) {
      // Generate and store OTP
      const otp = OTP.generateOTP();
      await OTP.storeOTP(email, otp);

      // Send OTP via email
      try {
        await sendOTPEmail(email, otp, user.name || 'User');
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // In development, log OTP to console as fallback
        if (process.env.NODE_ENV === 'development') {
          console.log(`📧 OTP for ${email}: ${otp}`);
        }
        // Still return success to not reveal if email exists
      }
    }

    res.json({ 
      message: 'If the email exists, a verification code has been sent to your email address.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    const verification = await OTP.verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Generate a temporary token for password reset (15 minutes expiry)
    const resetToken = jwt.sign(
      { email, type: 'password_reset' },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '15m' }
    );

    res.json({ 
      message: 'OTP verified successfully',
      resetToken 
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', [
  body('resetToken').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resetToken, password } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid reset token' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new password reset.' });
    }

    const { email } = decoded;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await User.update(user._id, { password: hashedPassword });

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
