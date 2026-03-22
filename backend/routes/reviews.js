const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { ObjectId } = require('../config/database');
const authenticate = require('../middleware/auth');
const Mechanic = require('../models/Mechanic');
const { onReviewCreated } = require('../utils/notify');
const router = express.Router();

// Create review
router.post('/', authenticate, async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;

    if (req.user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create reviews' });
    }

    if (!booking_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating (1-5 required)' });
    }

    // Verify booking exists and belongs to customer
    const booking = await Booking.findById(booking_id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const bookingCustomerId = booking.customer_id ? (typeof booking.customer_id === 'object' ? booking.customer_id.toString() : booking.customer_id) : null;
    if (bookingCustomerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Booking must be completed to review' });
    }

    const existingReview = await Review.findByBookingId(booking_id);
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }

    // Create review
    await Review.create({
      booking_id: new ObjectId(booking_id),
      customer_id: new ObjectId(req.user.id),
      mechanic_id: booking.mechanic_id,
      rating,
      comment: comment || null
    });

    // Update mechanic rating
    const mechanicId = booking.mechanic_id ? (typeof booking.mechanic_id === 'object' ? booking.mechanic_id.toString() : booking.mechanic_id) : null;
    if (mechanicId) {
      await Review.updateMechanicRating(mechanicId);
    }

    try {
      const customer = await User.findById(req.user.id);
      const mechanicDoc = mechanicId ? await Mechanic.findById(mechanicId) : null;
      await onReviewCreated(
        mechanicDoc?.user_id,
        rating,
        customer ? customer.name : null
      );
    } catch (notifyErr) {
      console.error('Review created notify error:', notifyErr);
    }

    res.status(201).json({ message: 'Review created successfully' });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reviews for a mechanic
router.get('/mechanic/:mechanic_id', async (req, res) => {
  try {
    const { mechanic_id } = req.params;

    const reviews = await Review.findByMechanicId(mechanic_id);

    // Populate customer names
    for (let review of reviews) {
      if (review.customer_id) {
        const customer = await User.findById(review.customer_id);
        if (customer) {
          review.customer_name = customer.name;
        }
      }
    }

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
