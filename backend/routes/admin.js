const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const Booking = require('../models/Booking');
const { getCollection, ObjectId } = require('../config/database');
const router = express.Router();

// Admin Dashboard Stats
router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
    const usersCollection = User.collection();
    const mechanicsCollection = Mechanic.collection();
    const bookingsCollection = Booking.collection();

    // Get total counts
    const totalUsers = await usersCollection.countDocuments({ user_type: 'customer' });
    const totalMechanics = await usersCollection.countDocuments({ user_type: 'mechanic' });
    const totalBookings = await bookingsCollection.countDocuments();
    const pendingBookings = await bookingsCollection.countDocuments({ status: 'pending' });
    const activeBookings = await bookingsCollection.countDocuments({ 
      status: { $in: ['accepted', 'in_progress', 'on_the_way'] } 
    });
    const completedBookings = await bookingsCollection.countDocuments({ status: 'completed' });
    const verifiedMechanics = await mechanicsCollection.countDocuments({ is_verified: true });
    const onlineMechanics = await mechanicsCollection.countDocuments({ is_online: true });

    // Get recent bookings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBookings = await bookingsCollection.countDocuments({
      created_at: { $gte: sevenDaysAgo }
    });

    // Get new users (last 7 days)
    const newUsers = await usersCollection.countDocuments({
      created_at: { $gte: sevenDaysAgo }
    });

    res.json({
      totalUsers,
      totalMechanics,
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      verifiedMechanics,
      onlineMechanics,
      recentBookings,
      newUsers
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (customers and mechanics)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { type, page = 1, limit = 20, search } = req.query;
    const usersCollection = User.collection();
    
    const query = {};
    if (type && (type === 'customer' || type === 'mechanic')) {
      query.user_type = type;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await usersCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await usersCollection.countDocuments(query);

    // Remove passwords from response
    const safeUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      user_type: user.user_type,
      profile_picture: user.profile_picture || null,
      created_at: user.created_at,
      is_verified: user.is_verified || false
    }));

    res.json({
      users: safeUsers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all mechanics with details
router.get('/mechanics', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, verified, online } = req.query;
    const mechanicsCollection = Mechanic.collection();
    const usersCollection = User.collection();
    
    const query = {};
    
    if (verified === 'true') {
      query.is_verified = true;
    } else if (verified === 'false') {
      query.is_verified = false;
    }
    
    if (online === 'true') {
      query.is_online = true;
    } else if (online === 'false') {
      query.is_online = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let mechanics = await mechanicsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await mechanicsCollection.countDocuments(query);

    // Populate user details
    const mechanicsWithUsers = await Promise.all(
      mechanics.map(async (mechanic) => {
        const user = await usersCollection.findOne({ _id: mechanic.user_id });
        return {
          id: mechanic._id.toString(),
          user_id: mechanic.user_id.toString(),
          business_name: mechanic.business_name,
          license_number: mechanic.license_number,
          years_experience: mechanic.years_experience,
          latitude: mechanic.current_latitude || mechanic.latitude,
          longitude: mechanic.current_longitude || mechanic.longitude,
          service_radius: mechanic.service_radius,
          is_available: mechanic.is_available,
          is_online: mechanic.is_online,
          is_verified: mechanic.is_verified,
          rating: mechanic.rating || 0,
          total_reviews: mechanic.total_reviews || 0,
          total_customers: mechanic.total_customers || 0,
          user: user ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            profile_picture: user.profile_picture
          } : null,
          created_at: mechanic.created_at,
          updated_at: mechanic.updated_at
        };
      })
    );

    // Filter by search if provided
    let filteredMechanics = mechanicsWithUsers;
    if (search) {
      filteredMechanics = mechanicsWithUsers.filter(m => 
        m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      mechanics: filteredMechanics,
      total: search ? filteredMechanics.length : total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((search ? filteredMechanics.length : total) / parseInt(limit))
    });
  } catch (error) {
    console.error('Get all mechanics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify/Unverify mechanic
router.put('/mechanics/:id/verify', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({ error: 'is_verified must be a boolean' });
    }

    const mechanic = await Mechanic.findById(id);
    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    await Mechanic.update(id, { is_verified });
    
    res.json({ 
      message: `Mechanic ${is_verified ? 'verified' : 'unverified'} successfully`,
      is_verified 
    });
  } catch (error) {
    console.error('Verify mechanic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const bookingsCollection = Booking.collection();
    const usersCollection = User.collection();
    const mechanicsCollection = Mechanic.collection();
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let bookings = await bookingsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await bookingsCollection.countDocuments(query);

    // Populate customer and mechanic details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await usersCollection.findOne({ _id: booking.customer_id });
        const mechanic = await mechanicsCollection.findOne({ _id: booking.mechanic_id });
        const mechanicUser = mechanic ? await usersCollection.findOne({ _id: mechanic.user_id }) : null;

        return {
          id: booking._id.toString(),
          customer: customer ? {
            id: customer._id.toString(),
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            profile_picture: customer.profile_picture
          } : null,
          mechanic: mechanic ? {
            id: mechanic._id.toString(),
            business_name: mechanic.business_name,
            user: mechanicUser ? {
              name: mechanicUser.name,
              email: mechanicUser.email,
              phone: mechanicUser.phone,
              profile_picture: mechanicUser.profile_picture
            } : null
          } : null,
          service_type: booking.service_type,
          vehicle_type: booking.vehicle_type,
          vehicle_brand: booking.vehicle_brand,
          vehicle_model: booking.vehicle_model,
          description: booking.description,
          status: booking.status,
          customer_latitude: booking.customer_latitude,
          customer_longitude: booking.customer_longitude,
          mechanic_latitude: booking.mechanic_latitude,
          mechanic_longitude: booking.mechanic_longitude,
          eta: booking.eta,
          created_at: booking.created_at,
          updated_at: booking.updated_at
        };
      })
    );

    // Filter by search if provided
    let filteredBookings = bookingsWithDetails;
    if (search) {
      filteredBookings = bookingsWithDetails.filter(b => 
        b.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
        b.mechanic?.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.mechanic?.user?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      bookings: filteredBookings,
      total: search ? filteredBookings.length : total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((search ? filteredBookings.length : total) / parseInt(limit))
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status (admin override)
router.put('/bookings/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'accepted', 'rejected', 'in_progress', 'on_the_way', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await Booking.update(id, { status });
    
    res.json({ 
      message: 'Booking status updated successfully',
      status 
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If mechanic, also delete mechanic profile
    if (user.user_type === 'mechanic') {
      const mechanic = await Mechanic.findByUserId(id);
      if (mechanic) {
        const mechanicsCollection = Mechanic.collection();
        await mechanicsCollection.deleteOne({ _id: mechanic._id });
      }
    }

    const usersCollection = User.collection();
    await usersCollection.deleteOne({ _id: new ObjectId(id) });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

