const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { connectDB } = require('./config/database');
const { testEmailConnection } = require('./utils/emailService');
const Mechanic = require('./models/Mechanic');
const Booking = require('./models/Booking');
const ChatMessage = require('./models/ChatMessage');
const { canUserAccessBookingChat, getBookingForChat } = require('./utils/bookingChatAccess');
const { setNotificationIO, emitChatUnreadRefresh } = require('./utils/notificationHub');
const { notifyUser } = require('./utils/notify');

const app = express();
const server = http.createServer(app);

const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();
const allowAllOrigins = allowedOrigins.includes('*');

const corsOptions = {
  origin: (origin, callback) => {
    if (allowAllOrigins || !origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = socketIo(server, {
  cors: {
    origin: allowAllOrigins ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});
setNotificationIO(io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token || typeof token !== 'string') {
      socket.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      user_type: decoded.user_type,
    };
    next();
  } catch {
    socket.user = null;
    next();
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/mechanics', require('./routes/mechanics'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mechanic Finder API is running' });
});

// Socket.io for real-time updates
const activeMechanics = new Map(); // socketId -> { mechanicId, userId }
const activeCustomers = new Map(); // socketId -> { userId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('notifications:join', (data) => {
    const uid = data && data.userId;
    if (uid && /^[0-9a-fA-F]{24}$/.test(String(uid))) {
      socket.join(`user:${uid}`);
    }
  });

  // Mechanic connects and shares location
  socket.on('mechanic:connect', async (data) => {
    const { mechanicId, userId } = data;
    activeMechanics.set(socket.id, { mechanicId, userId });
    socket.join(`mechanic:${mechanicId}`);

    try {
      const doc = await Mechanic.findById(mechanicId);
      // Only verified mechanics go "online" for discovery; unverified may still use the app
      if (doc && doc.is_verified) {
        await Mechanic.update(mechanicId, { is_online: true });
        console.log(`Mechanic ${mechanicId} connected and set as online`);
      }
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
      const doc = await Mechanic.findById(mechanic.mechanicId);
      if (!doc || !doc.is_verified) {
        return;
      }

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
      const distanceKm = parseFloat(distance.toFixed(2));

      const payload = {
        bookingId,
        distance: distanceKm,
        mechanicLatitude: mechanicLat,
        mechanicLongitude: mechanicLng,
        customerLatitude,
        customerLongitude,
      };

      // ETA while en route only; after mechanic marks arrived, show map position without ETA refresh in DB
      if (booking.status === 'accepted') {
        await Booking.update(bookingId, { estimated_eta: estimatedETA });
        payload.eta = estimatedETA;
      } else if (
        ['mechanic_arrived', 'arrival_confirmed', 'in_progress', 'completion_pending'].includes(
          booking.status
        )
      ) {
        payload.eta = null;
      } else {
        return;
      }

      io.to(`booking:${bookingId}`).emit('booking:eta-update', payload);
    } catch (error) {
      console.error('ETA calculation error:', error);
    }
  });

  // Join booking room
  socket.on('booking:join', (data) => {
    const { bookingId } = data;
    socket.join(`booking:${bookingId}`);
  });

  function serializeChatMessage(doc) {
    return {
      id: doc._id.toString(),
      booking_id: doc.booking_id.toString(),
      sender_user_id: doc.sender_user_id.toString(),
      sender_role: doc.sender_role,
      body: doc.body,
      created_at: doc.created_at,
    };
  }

  socket.on('chat:join', async (data) => {
    if (!socket.user) {
      socket.emit('chat:error', { error: 'Sign in required for chat' });
      return;
    }
    const bookingId = data && data.bookingId;
    if (!bookingId || !/^[0-9a-fA-F]{24}$/.test(String(bookingId))) {
      socket.emit('chat:error', { error: 'Invalid booking' });
      return;
    }
    try {
      const booking = await getBookingForChat(bookingId);
      if (!booking) {
        socket.emit('chat:error', { error: 'Booking not found' });
        return;
      }
      const allowed = await canUserAccessBookingChat(socket.user, booking);
      if (!allowed) {
        socket.emit('chat:error', { error: 'Not allowed' });
        return;
      }
      socket.join(`booking:${bookingId}`);
      socket.emit('chat:joined', { bookingId });
    } catch (e) {
      console.error('chat:join error:', e);
      socket.emit('chat:error', { error: 'Could not join chat' });
    }
  });

  socket.on('chat:leave', (data) => {
    const bookingId = data && data.bookingId;
    if (bookingId && /^[0-9a-fA-F]{24}$/.test(String(bookingId))) {
      socket.leave(`booking:${bookingId}`);
    }
  });

  socket.on('chat:send', async (data) => {
    if (!socket.user) {
      socket.emit('chat:error', { error: 'Sign in required for chat' });
      return;
    }
    const bookingId = data && data.bookingId;
    const text = data && data.text;
    if (!bookingId || !/^[0-9a-fA-F]{24}$/.test(String(bookingId))) {
      socket.emit('chat:error', { error: 'Invalid booking' });
      return;
    }
    try {
      const booking = await getBookingForChat(bookingId);
      if (!booking) {
        socket.emit('chat:error', { error: 'Booking not found' });
        return;
      }
      const allowed = await canUserAccessBookingChat(socket.user, booking);
      if (!allowed) {
        socket.emit('chat:error', { error: 'Not allowed' });
        return;
      }
      const senderRole = socket.user.user_type === 'mechanic' ? 'mechanic' : 'customer';
      const saved = await ChatMessage.create({
        booking_id: bookingId,
        sender_user_id: socket.user.id,
        sender_role: senderRole,
        body: typeof text === 'string' ? text : '',
      });
      const payload = serializeChatMessage(saved);
      io.to(`booking:${bookingId}`).emit('chat:message', payload);

      const customerId = booking.customer_id ? booking.customer_id.toString() : null;
      const mechanicIdStr =
        booking.mechanic_id && typeof booking.mechanic_id === 'object'
          ? booking.mechanic_id.toString()
          : String(booking.mechanic_id || '');
      let recipientUserId = null;
      if (socket.user.user_type === 'customer' && mechanicIdStr) {
        const mechanicDoc = await Mechanic.findById(mechanicIdStr);
        if (mechanicDoc && mechanicDoc.user_id) {
          recipientUserId = mechanicDoc.user_id.toString();
        }
      } else if (socket.user.user_type === 'mechanic' && customerId) {
        recipientUserId = customerId;
      }
      if (recipientUserId && recipientUserId !== socket.user.id) {
        const preview = (payload.body || '').slice(0, 120);
        const recipientIsCustomer = recipientUserId === customerId;
        const link = recipientIsCustomer
          ? `/chat/${bookingId}`
          : `/mechanic/workspace/messages?booking=${bookingId}`;
        try {
          await notifyUser(recipientUserId, {
            title: 'New message',
            body: preview || 'You have a new message about a booking.',
            type: 'chat_message',
            link,
            meta: { bookingId, senderUserId: socket.user.id },
          });
        } catch (notifyErr) {
          console.error('Chat notify error:', notifyErr);
        }
        emitChatUnreadRefresh(recipientUserId);
      }
    } catch (e) {
      const msg = e && e.message ? e.message : 'Send failed';
      socket.emit('chat:error', { error: msg });
    }
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

