const express = require('express');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/upload');
const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const userProfile = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      user_type: user.user_type,
      profile_picture: user.profile_picture || null,
      vehicle_models: user.vehicle_models || [],
      preferred_service_locations: user.preferred_service_locations || [],
      service_requirements: user.service_requirements || '',
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json(userProfile);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { vehicle_models, preferred_service_locations, service_requirements, phone } = req.body;

    const updateData = {};

    if (vehicle_models !== undefined) {
      updateData.vehicle_models = vehicle_models;
    }
    if (preferred_service_locations !== undefined) {
      updateData.preferred_service_locations = preferred_service_locations;
    }
    if (service_requirements !== undefined) {
      updateData.service_requirements = service_requirements;
    }
    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await User.update(req.user.id, updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile picture
router.post('/profile/picture', authenticate, upload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'mechanic-finder/profiles');

    // Update user profile with picture URL
    await User.update(req.user.id, { profile_picture: result.secure_url });

    res.json({ 
      message: 'Profile picture uploaded successfully',
      profile_picture: result.secure_url
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

module.exports = router;

