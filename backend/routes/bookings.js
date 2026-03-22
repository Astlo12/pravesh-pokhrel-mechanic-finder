const express = require('express');
const Booking = require('../models/Booking');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');
const Review = require('../models/Review');
const { ObjectId } = require('../config/database');
const authenticate = require('../middleware/auth');
const { validateTransition, isValidStatus } = require('../utils/bookingTransitions');
const { onBookingCreated, onBookingStatusChange } = require('../utils/notify');
const router = express.Router();

// Create booking
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      mechanic_id,
      service_type,
      vehicle_type,
      vehicle_brand,
      issue_description,
      latitude,
      longitude,
      address,
      scheduled_date
    } = req.body;

    if (req.user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create bookings' });
    }

    if (!mechanic_id || !service_type || !vehicle_type || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (service_type === 'scheduled' && !scheduled_date) {
      return res.status(400).json({ error: 'Scheduled date is required for scheduled services' });
    }

    // Get mechanic's current location at booking time (for reference)
    // Convert mechanic_id to string if it's a number
    const mechanicIdStr = typeof mechanic_id === 'number' ? mechanic_id.toString() : String(mechanic_id);
    
    // Validate ObjectId format (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(mechanicIdStr)) {
      return res.status(400).json({ error: 'Invalid mechanic ID format' });
    }
    
    const mechanic = await Mechanic.findById(mechanicIdStr);
    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }
    if (!mechanic.is_verified) {
      return res.status(403).json({
        error: 'This mechanic is not verified yet and cannot accept bookings.',
      });
    }

    const mechanicLat = mechanic.current_latitude || mechanic.latitude;
    const mechanicLng = mechanic.current_longitude || mechanic.longitude;

    // Validate customer_id (req.user.id) is a valid ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(String(req.user.id))) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    const bookingId = await Booking.create({
      customer_id: new ObjectId(req.user.id),
      mechanic_id: new ObjectId(mechanicIdStr),
      service_type,
      vehicle_type,
      vehicle_brand: vehicle_brand || null,
      issue_description: issue_description || null,
      // Customer location (from GPS)
      latitude, // Keep for backward compatibility
      longitude, // Keep for backward compatibility
      customer_latitude: latitude,
      customer_longitude: longitude,
      // Mechanic location at booking time (for reference)
      mechanic_latitude: mechanicLat,
      mechanic_longitude: mechanicLng,
      address: address || null,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : null
    });

    // Get booking details with populated data
    const booking = await Booking.findById(bookingId);
    const customer = booking.customer_id ? await User.findById(booking.customer_id) : null;
    // Reuse the mechanic variable we already fetched above
    const mechanicUser = mechanic && mechanic.user_id ? await User.findById(mechanic.user_id) : null;

    const bookingResponse = {
      ...booking,
      id: booking._id.toString(),
      customer_name: customer ? customer.name : null,
      customer_profile_picture: customer ? (customer.profile_picture || null) : null,
      business_name: mechanic ? mechanic.business_name : null,
      mechanic_profile_picture: mechanicUser ? (mechanicUser.profile_picture || null) : null,
      // Ensure location fields are properly named
      customer_latitude: booking.customer_latitude || booking.latitude,
      customer_longitude: booking.customer_longitude || booking.longitude,
      mechanic_current_latitude: mechanic ? (mechanic.current_latitude || mechanic.latitude) : null,
      mechanic_current_longitude: mechanic ? (mechanic.current_longitude || mechanic.longitude) : null
    };

    try {
      await onBookingCreated(booking, customer ? customer.name : null, mechanic ? mechanic.business_name : null);
    } catch (notifyErr) {
      console.error('Booking created notify error:', notifyErr);
    }

    res.status(201).json(bookingResponse);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get bookings for customer
router.get('/customer', authenticate, async (req, res) => {
  try {
    if (req.user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const bookings = await Booking.findByCustomerId(req.user.id);
    const bookingOids = bookings.map((b) => b._id);
    const myReviews = await Review.findByCustomerForBookings(req.user.id, bookingOids);
    const reviewByBookingId = new Map(myReviews.map((r) => [r.booking_id.toString(), r]));

    // Populate mechanic data
    for (let booking of bookings) {
      booking.id = booking._id.toString();
      if (booking.mechanic_id) {
        const mechanic = await Mechanic.findById(booking.mechanic_id);
        if (mechanic) {
          booking.business_name = mechanic.business_name;
          booking.rating = mechanic.rating;
          // Include mechanic's current location (real-time) if available
          booking.mechanic_current_latitude = mechanic.current_latitude || mechanic.latitude;
          booking.mechanic_current_longitude = mechanic.current_longitude || mechanic.longitude;
          if (mechanic.user_id) {
            const mechanicUser = await User.findById(mechanic.user_id);
            if (mechanicUser) {
              booking.mechanic_name = mechanicUser.name;
              booking.mechanic_phone = mechanicUser.phone;
              booking.mechanic_profile_picture = mechanicUser.profile_picture || null;
            }
          }
        }
      }
      // Ensure customer location is available
      if (!booking.customer_latitude && booking.latitude) {
        booking.customer_latitude = booking.latitude;
        booking.customer_longitude = booking.longitude;
      }

      const rev = reviewByBookingId.get(booking._id.toString());
      booking.my_review = rev
        ? {
            rating: rev.rating,
            comment: rev.comment || null,
            created_at: rev.created_at,
          }
        : null;
    }

    res.json(bookings);
  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings for mechanic
router.get('/mechanic', authenticate, async (req, res) => {
  try {
    if (req.user.user_type !== 'mechanic') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get mechanic ID
    const mechanic = await Mechanic.findByUserId(req.user.id);

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic profile not found' });
    }

    const bookings = await Booking.findByMechanicId(mechanic._id.toString());

    // Populate customer data
    for (let booking of bookings) {
      booking.id = booking._id.toString();
      if (booking.customer_id) {
        const customer = await User.findById(booking.customer_id);
        if (customer) {
          booking.customer_name = customer.name;
          booking.customer_phone = customer.phone;
          booking.customer_profile_picture = customer.profile_picture || null;
        }
      }
      // Ensure customer location is available
      if (!booking.customer_latitude && booking.latitude) {
        booking.customer_latitude = booking.latitude;
        booking.customer_longitude = booking.longitude;
      }
      // Include mechanic's current location (real-time) for ETA calculations
      if (booking.mechanic_id) {
        const mechanic = await Mechanic.findById(booking.mechanic_id);
        if (mechanic) {
          booking.mechanic_current_latitude = mechanic.current_latitude || mechanic.latitude;
          booking.mechanic_current_longitude = mechanic.current_longitude || mechanic.longitude;
        }
      }
    }

    res.json(bookings);
  } catch (error) {
    console.error('Get mechanic bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status (role-based state machine)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, estimated_eta } = req.body;

    if (!status || !isValidStatus(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let role = null;
    if (req.user.user_type === 'mechanic') {
      const mechanic = await Mechanic.findByUserId(req.user.id);
      if (!mechanic || mechanic._id.toString() !== booking.mechanic_id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (!mechanic.is_verified && (status === 'accepted' || status === 'rejected')) {
        return res.status(403).json({
          error: 'Your profile must be verified before you can accept or reject booking requests.',
        });
      }
      role = 'mechanic';
    } else if (req.user.user_type === 'customer') {
      if (booking.customer_id.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      role = 'customer';
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = validateTransition(booking, status, role);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const updateData = { ...result.update };
    if (estimated_eta != null && status === 'accepted') {
      const n = typeof estimated_eta === 'number' ? estimated_eta : parseInt(String(estimated_eta), 10);
      if (Number.isFinite(n)) updateData.estimated_eta = n;
    }

    await Booking.update(id, updateData);

    const mechanicIdStr =
      booking.mechanic_id && typeof booking.mechanic_id === 'object'
        ? booking.mechanic_id.toString()
        : String(booking.mechanic_id);

    if (status === 'accepted' && booking.mechanic_id) {
      await Mechanic.update(mechanicIdStr, { is_available: false });
    }

    if ((status === 'completed' || status === 'cancelled' || status === 'rejected') && booking.mechanic_id) {
      await Mechanic.update(mechanicIdStr, { is_available: true });
    }

    try {
      await onBookingStatusChange(booking, status);
    } catch (notifyErr) {
      console.error('Booking status notify error:', notifyErr);
    }

    res.json({ message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify authorization
    if (req.user.user_type === 'mechanic') {
      const mechanic = await Mechanic.findByUserId(req.user.id);
      if (!mechanic || mechanic._id.toString() !== booking.mechanic_id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.user.user_type === 'customer') {
      if (booking.customer_id.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    // Populate user data
    const customer = booking.customer_id ? await User.findById(booking.customer_id) : null;
    const mechanic = booking.mechanic_id ? await Mechanic.findById(booking.mechanic_id) : null;
    const mechanicUser = mechanic && mechanic.user_id ? await User.findById(mechanic.user_id) : null;

    const bookingResponse = {
      ...booking,
      id: booking._id.toString(),
      customer_name: customer ? customer.name : null,
      customer_phone: customer ? customer.phone : null,
      customer_profile_picture: customer ? (customer.profile_picture || null) : null,
      mechanic_name: mechanicUser ? mechanicUser.name : null,
      mechanic_phone: mechanicUser ? mechanicUser.phone : null,
      mechanic_profile_picture: mechanicUser ? (mechanicUser.profile_picture || null) : null,
      business_name: mechanic ? mechanic.business_name : null,
      rating: mechanic ? mechanic.rating : null,
      mechanic_current_latitude: mechanic
        ? (mechanic.current_latitude || mechanic.latitude)
        : null,
      mechanic_current_longitude: mechanic
        ? (mechanic.current_longitude || mechanic.longitude)
        : null,
      customer_latitude: booking.customer_latitude || booking.latitude,
      customer_longitude: booking.customer_longitude || booking.longitude
    };

    if (req.user.user_type === 'customer' && booking.customer_id.toString() === req.user.id) {
      const rev = await Review.findByBookingId(id);
      if (rev && rev.customer_id && rev.customer_id.toString() === req.user.id) {
        bookingResponse.my_review = {
          rating: rev.rating,
          comment: rev.comment || null,
          created_at: rev.created_at,
        };
      } else {
        bookingResponse.my_review = null;
      }
    }

    res.json(bookingResponse);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
