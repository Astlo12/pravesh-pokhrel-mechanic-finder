const express = require('express');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');
const Review = require('../models/Review');
const { ObjectId } = require('../config/database');
const authenticate = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/upload');
const router = express.Router();

// Get current mechanic's profile (for authenticated mechanics)
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    if (req.user.user_type !== 'mechanic') {
      return res.status(403).json({ error: 'Only mechanics can access this endpoint' });
    }

    const mechanic = await Mechanic.findByUserId(req.user.id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic profile not found' });
    }

    res.json({ mechanicId: mechanic._id.toString() });
  } catch (error) {
    console.error('Get mechanic profile ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Emergency mechanic search
router.get('/emergency', async (req, res) => {
  try {
    const { latitude, longitude, vehicle_type, vehicle_brand } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const filters = {};
    if (vehicle_type) filters.vehicle_type = vehicle_type;
    if (vehicle_brand) filters.vehicle_brand = vehicle_brand;
    
    // Include reference location for distance calculation
    filters.referenceLat = lat;
    filters.referenceLng = lng;

    // For emergency, show ALL active mechanics regardless of radius
    const mechanics = await Mechanic.findAllActive(filters);

    // Populate user data and vehicle capabilities
    for (let mechanic of mechanics) {
      if (mechanic.user_id) {
        const user = await User.findById(mechanic.user_id);
        if (user) {
          mechanic.name = user.name;
          mechanic.phone = user.phone;
          mechanic.email = user.email;
          mechanic.profile_picture = user.profile_picture || null;
        }
      }

      if (mechanic.vehicle_capabilities) {
        mechanic.vehicle_capabilities = Array.isArray(mechanic.vehicle_capabilities) 
          ? mechanic.vehicle_capabilities 
          : [mechanic.vehicle_capabilities];
      }

      mechanic.id = mechanic._id.toString();
      
      // Ensure service_radius is included
      if (!mechanic.service_radius) {
        mechanic.service_radius = 10; // Default radius
      }
    }

    // Sort by distance and availability (prioritize online and available)
    mechanics.sort((a, b) => {
      if (a.is_online && a.is_available && !(b.is_online && b.is_available)) return -1;
      if (!(a.is_online && a.is_available) && b.is_online && b.is_available) return 1;
      return (a.distance || 999) - (b.distance || 999);
    });

    res.json(mechanics);
  } catch (error) {
    console.error('Emergency search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get nearby available mechanics
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, vehicle_type, vehicle_brand, emergency } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    const filters = {};
    if (vehicle_type) filters.vehicle_type = vehicle_type;
    if (vehicle_brand) filters.vehicle_brand = vehicle_brand;

    // If emergency mode, use larger radius
    const searchRadius = emergency === 'true' ? radiusKm * 1.5 : radiusKm;
    const mechanics = await Mechanic.findNearby(lat, lng, searchRadius, filters);

    // Populate user data and vehicle capabilities
    for (let mechanic of mechanics) {
      if (mechanic.user_id) {
        const user = await User.findById(mechanic.user_id);
        if (user) {
          mechanic.name = user.name;
          mechanic.phone = user.phone;
          mechanic.email = user.email;
          mechanic.profile_picture = user.profile_picture || null;
        }
      }

      // Vehicle capabilities are stored in the mechanic document
      if (mechanic.vehicle_capabilities) {
        mechanic.vehicle_capabilities = Array.isArray(mechanic.vehicle_capabilities) 
          ? mechanic.vehicle_capabilities 
          : [mechanic.vehicle_capabilities];
      }

      // Convert _id to id for consistency
      mechanic.id = mechanic._id.toString();
      
      // Ensure service_radius is included
      if (!mechanic.service_radius) {
        mechanic.service_radius = 10; // Default radius
      }
    }

    res.json(mechanics);
  } catch (error) {
    console.error('Get nearby mechanics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mechanic profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    // Get user data
    if (mechanic.user_id) {
      const user = await User.findById(mechanic.user_id);
      if (user) {
        mechanic.name = user.name;
        mechanic.email = user.email;
        mechanic.phone = user.phone;
        mechanic.profile_picture = user.profile_picture || null;
      }
      // Include user_id for frontend to check if it's own profile
      mechanic.user_id = mechanic.user_id.toString();
    }

    // Get vehicle capabilities
    if (mechanic.vehicle_capabilities) {
      mechanic.vehicle_capabilities = Array.isArray(mechanic.vehicle_capabilities) 
        ? mechanic.vehicle_capabilities 
        : [mechanic.vehicle_capabilities];
    }

    // Ensure all profile fields are included
    if (!mechanic.certifications) mechanic.certifications = [];
    if (!mechanic.services_offered) mechanic.services_offered = [];
    if (!mechanic.work_history) mechanic.work_history = [];
    if (!mechanic.is_verified) mechanic.is_verified = false;

    // Include both base and current location for mechanics viewing their own profile
    mechanic.base_latitude = mechanic.latitude;
    mechanic.base_longitude = mechanic.longitude;
    
    // Prioritize current location (real-time) over base location for display
    // If current location exists, use it; otherwise fall back to base location
    if (mechanic.current_latitude && mechanic.current_longitude) {
      mechanic.latitude = mechanic.current_latitude;
      mechanic.longitude = mechanic.current_longitude;
      mechanic.location_is_current = true; // Flag to indicate this is real-time location
    } else {
      mechanic.location_is_current = false; // Base location, not real-time
    }

    // Get recent reviews
    const reviews = await Review.findByMechanicId(id, 10);
    for (let review of reviews) {
      if (review.customer_id) {
        const customer = await User.findById(review.customer_id);
        if (customer) {
          review.customer_name = customer.name;
        }
      }
    }
    mechanic.reviews = reviews;

    // Convert _id to id for consistency
    mechanic.id = mechanic._id.toString();

    res.json(mechanic);
  } catch (error) {
    console.error('Get mechanic profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mechanic availability
router.put('/:id/availability', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available, latitude, longitude } = req.body;

    // Verify mechanic owns this profile
    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    const userId = mechanic.user_id ? (typeof mechanic.user_id === 'object' ? mechanic.user_id.toString() : mechanic.user_id) : null;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = {};
    if (is_available !== undefined) {
      updateData.is_available = is_available;
    }
    if (latitude !== undefined && longitude !== undefined) {
      updateData.latitude = latitude;
      updateData.longitude = longitude;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await Mechanic.update(id, updateData);

    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mechanic profile
router.put('/:id/profile', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      business_name, 
      license_number, 
      vehicle_capabilities, 
      years_experience, 
      service_radius,
      latitude,
      longitude,
      certifications,
      services_offered,
      work_history,
      working_time
    } = req.body;

    // Verify mechanic owns this profile
    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    const userId = mechanic.user_id ? (typeof mechanic.user_id === 'object' ? mechanic.user_id.toString() : mechanic.user_id) : null;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = {};

    if (business_name !== undefined) updateData.business_name = business_name;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (years_experience !== undefined) updateData.years_experience = years_experience;
    if (service_radius !== undefined) updateData.service_radius = service_radius;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (services_offered !== undefined) updateData.services_offered = services_offered;
    if (work_history !== undefined) updateData.work_history = work_history;
    if (working_time !== undefined) updateData.working_time = working_time;
    
    // Update base location (latitude/longitude)
    if (latitude !== undefined && longitude !== undefined) {
      updateData.latitude = parseFloat(latitude);
      updateData.longitude = parseFloat(longitude);
    }

    // Update vehicle capabilities - convert to array format
    if (vehicle_capabilities !== undefined) {
      if (Array.isArray(vehicle_capabilities)) {
        updateData.vehicle_capabilities = vehicle_capabilities;
      } else {
        updateData.vehicle_capabilities = [vehicle_capabilities];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await Mechanic.update(id, updateData);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set mechanic online status
router.put('/:id/online', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_online } = req.body;

    // Verify mechanic owns this profile
    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    const userId = mechanic.user_id ? (typeof mechanic.user_id === 'object' ? mechanic.user_id.toString() : mechanic.user_id) : null;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Mechanic.update(id, { is_online });

    res.json({ message: 'Online status updated successfully' });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload mechanic profile picture
router.post('/:id/profile/picture', authenticate, upload.single('profile_picture'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify mechanic owns this profile
    const mechanic = await Mechanic.findById(id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    const userId = mechanic.user_id ? (typeof mechanic.user_id === 'object' ? mechanic.user_id.toString() : mechanic.user_id) : null;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'mechanic-finder/profiles');

    // Update user profile with picture URL (mechanic profile picture is stored in user)
    await User.update(userId, { profile_picture: result.secure_url });

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
