const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const { testEmailConnection } = require('./utils/emailService');
const Mechanic = require('./models/Mechanic');
const Booking = require('./models/Booking');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/mechanics', require('./routes/mechanics'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mechanic Finder API is running' });
});

// Socket.io for real-time updates
const activeMechanics = new Map(); // socketId -> { mechanicId, userId }
const activeCustomers = new Map(); // socketId -> { userId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Mechanic connects and shares location
  socket.on('mechanic:connect', async (data) => {
    const { mechanicId, userId } = data;
    activeMechanics.set(socket.id, { mechanicId, userId });
    socket.join(`mechanic:${mechanicId}`);
    
    // Set mechanic as online
    try {
      await Mechanic.update(mechanicId, { is_online: true });
      console.log(`Mechanic ${mechanicId} connected and set as online`);
    } catch (error) {
      console.error('Error setting mechanic online:', error);
    }
  });

  // Mechanic updates location
  socket.on('mechanic:location-update', async (data) => {
    const mechanic = activeMechanics.get(socket.id);
    if (!mechanic) {
      console.warn('Location update received from unknown mechanic socket');
      return;
    }

    const { latitude, longitude } = data;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      console.error('Invalid location coordinates received:', { latitude, longitude });
      return;
    }

    try {
      // Update current location in database
      const result = await Mechanic.updateLocation(mechanic.mechanicId, latitude, longitude);
      
      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        console.log(`✓ Database updated for mechanic ${mechanic.mechanicId}:`, {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`⚠ No document updated for mechanic ${mechanic.mechanicId}`);
      }

      // Emit to customers tracking this mechanic
      io.to(`mechanic:${mechanic.mechanicId}`).emit('mechanic:location', {
        mechanicId: mechanic.mechanicId,
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Location update error:', error);
      // Emit error back to mechanic
      socket.emit('mechanic:location-update-error', {
        error: 'Failed to update location in database'
      });
    }
  });

  // Customer connects
  socket.on('customer:connect', (data) => {
    const { userId } = data;
    activeCustomers.set(socket.id, { userId });
    console.log(`Customer ${userId} connected`);
  });

  // Customer tracks mechanic
  socket.on('customer:track-mechanic', (data) => {
    const { mechanicId } = data;
    socket.join(`mechanic:${mechanicId}`);
    console.log(`Customer tracking mechanic ${mechanicId}`);
  });

  // Calculate and send ETA
  socket.on('booking:calculate-eta', async (data) => {
    const { bookingId, mechanicId, customerLat, customerLng } = data;

    try {
      // Get booking to get customer location if not provided
      const booking = await Booking.findById(bookingId);
      if (!booking) return;

      const customerLatitude = customerLat || booking.customer_latitude || booking.latitude;
      const customerLongitude = customerLng || booking.customer_longitude || booking.longitude;

      if (!customerLatitude || !customerLongitude) {
        console.error('Customer location not available for ETA calculation');
        return;
      }

      // Get mechanic current location (real-time)
      // Convert mechanicId to string if it's a number
      const mechanicIdStr = typeof mechanicId === 'number' ? mechanicId.toString() : mechanicId;
      const mechanic = await Mechanic.findById(mechanicIdStr);
      if (!mechanic) {
        console.error(`Mechanic not found: ${mechanicIdStr}`);
        return;
      }

      // Use current location (real-time) if available, otherwise use base location
      const mechanicLat = mechanic.current_latitude || mechanic.latitude;
      const mechanicLng = mechanic.current_longitude || mechanic.longitude;

      if (!mechanicLat || !mechanicLng) {
        console.error('Mechanic location not available for ETA calculation');
        return;
      }

      // Calculate distance (Haversine formula)
      const R = 6371; // Earth's radius in km
      const dLat = (customerLatitude - mechanicLat) * Math.PI / 180;
      const dLng = (customerLongitude - mechanicLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(mechanicLat * Math.PI / 180) *
                Math.cos(customerLatitude * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Estimate ETA (assuming average speed of 40 km/h)
      const estimatedETA = Math.round((distance / 40) * 60); // in minutes

      // Update booking with ETA
      await Booking.update(bookingId, { estimated_eta: estimatedETA });

      // Emit ETA to customer with mechanic's current location
      io.to(`booking:${bookingId}`).emit('booking:eta-update', {
        bookingId,
        eta: estimatedETA,
        distance: distance.toFixed(2),
        mechanicLatitude: mechanicLat,
        mechanicLongitude: mechanicLng,
        customerLatitude,
        customerLongitude
      });
    } catch (error) {
      console.error('ETA calculation error:', error);
    }
  });

  // Join booking room
  socket.on('booking:join', (data) => {
    const { bookingId } = data;
    socket.join(`booking:${bookingId}`);
  });

  // Mechanic explicitly disconnects
  socket.on('mechanic:disconnect', async () => {
    const mechanic = activeMechanics.get(socket.id);
    if (mechanic) {
      try {
        await Mechanic.update(mechanic.mechanicId, { is_online: false });
        console.log(`Mechanic ${mechanic.mechanicId} disconnected and set as offline`);
      } catch (error) {
        console.error('Error setting mechanic offline:', error);
      }
    }
    activeMechanics.delete(socket.id);
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const mechanic = activeMechanics.get(socket.id);
    if (mechanic) {
      try {
        await Mechanic.update(mechanic.mechanicId, { is_online: false });
        console.log(`Mechanic ${mechanic.mechanicId} disconnected and set as offline`);
      } catch (error) {
        console.error('Error setting mechanic offline:', error);
      }
    }
    activeMechanics.delete(socket.id);
    activeCustomers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Start server after database connection
connectDB()
  .then(async () => {
    // Test email connection if email is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await testEmailConnection();
    } else {
      console.log('⚠️  Email not configured. OTP emails will not be sent.');
      console.log('   Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email functionality.');
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

