const Notification = require('../models/Notification');
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const { emitNotificationRefresh } = require('./notificationHub');

async function notifyUser(userId, { title, body, type, link, meta }) {
  if (!userId) return;
  const id = typeof userId === 'string' ? userId : userId.toString();
  try {
    await Notification.create({
      user_id: id,
      title: title || 'Notification',
      body: body || '',
      type: type || 'general',
      link: link || null,
      meta: meta || null,
    });
    emitNotificationRefresh(id);
  } catch (e) {
    console.error('notifyUser error:', e);
  }
}

async function notifyAllAdmins({ title, body, type, link, meta }) {
  try {
    const admins = await User.findAdmins();
    await Promise.all(
      admins.map((a) => notifyUser(a._id.toString(), { title, body, type, link, meta }))
    );
  } catch (e) {
    console.error('notifyAllAdmins error:', e);
  }
}

/** After booking is created (customer placed it) */
async function onBookingCreated(booking, customerName, businessName) {
  const bid = booking._id.toString();
  const mechanic = await Mechanic.findById(booking.mechanic_id);
  if (mechanic?.user_id) {
    await notifyUser(mechanic.user_id.toString(), {
      title: 'New booking request',
      body: `${customerName || 'A customer'} requested ${(booking.service_type || 'service').replace(/_/g, ' ')}${businessName ? ` · ${businessName}` : ''}.`,
      type: 'booking_new',
      link: '/mechanic/workspace/bookings',
      meta: { bookingId: bid },
    });
  }
  await notifyAllAdmins({
    title: 'New booking',
    body: `${customerName || 'Customer'} → ${businessName || 'Mechanic'} · ${(booking.service_type || '').replace(/_/g, ' ')}`,
    type: 'admin_booking_new',
    link: '/admin/bookings',
    meta: { bookingId: bid },
  });
}

/**
 * booking = document before update; newStatus = next status.
 * options.notifyAdmins — set false when an admin overrides status (avoid duplicate admin alerts).
 */
async function onBookingStatusChange(booking, newStatus, options = {}) {
  const notifyAdminsFlag = options.notifyAdmins !== false;
  const bid = booking._id.toString();
  const customerId = booking.customer_id ? booking.customer_id.toString() : null;
  const mechanic = await Mechanic.findById(booking.mechanic_id);
  const mechanicUserId = mechanic?.user_id ? mechanic.user_id.toString() : null;

  const customerLink = `/track-booking/${bid}`;
  const mechanicLink = `/track-booking/${bid}`;

  const messages = {
    accepted: {
      customer: { title: 'Booking accepted', body: 'Your mechanic accepted the request. They are on the way.', type: 'booking_accepted' },
    },
    rejected: {
      customer: { title: 'Booking declined', body: 'The mechanic declined this request.', type: 'booking_rejected' },
    },
    cancelled: {
      mechanic: { title: 'Booking cancelled', body: 'The customer cancelled this booking.', type: 'booking_cancelled' },
    },
    mechanic_arrived: {
      customer: { title: 'Mechanic arrived', body: 'Confirm meet-up when you are together.', type: 'booking_arrived' },
    },
    arrival_confirmed: {
      mechanic: { title: 'Meet-up confirmed', body: 'The customer confirmed. You can start the service.', type: 'booking_arrival_ok' },
    },
    in_progress: {
      customer: { title: 'Service started', body: 'Your service is in progress.', type: 'booking_in_progress' },
    },
    completion_pending: {
      customer: { title: 'Confirm completion', body: 'The mechanic marked the job complete. Please confirm.', type: 'booking_complete_pending' },
    },
    completed: {
      mechanic: { title: 'Booking completed', body: 'The customer closed this booking.', type: 'booking_completed' },
    },
  };

  const entry = messages[newStatus];
  if (!entry) return;

  if (entry.customer && customerId) {
    await notifyUser(customerId, {
      ...entry.customer,
      link: customerLink,
      meta: { bookingId: bid, status: newStatus },
    });
  }
  if (entry.mechanic && mechanicUserId) {
    await notifyUser(mechanicUserId, {
      ...entry.mechanic,
      link: mechanicLink,
      meta: { bookingId: bid, status: newStatus },
    });
  }

  if (
    notifyAdminsFlag &&
    ['accepted', 'rejected', 'completed', 'cancelled'].includes(newStatus)
  ) {
    await notifyAllAdmins({
      title: `Booking ${newStatus.replace(/_/g, ' ')}`,
      body: `Booking ${bid.slice(0, 8)}… is now ${newStatus.replace(/_/g, ' ')}.`,
      type: 'admin_booking_status',
      link: '/admin/bookings',
      meta: { bookingId: bid, status: newStatus },
    });
  }
}

async function onMechanicRegistered(userName, email) {
  await notifyAllAdmins({
    title: 'New mechanic registration',
    body: `${userName || 'Mechanic'} (${email || '—'}) — pending verification.`,
    type: 'admin_mechanic_new',
    link: '/admin/verification',
    meta: {},
  });
}

async function onMechanicVerified(mechanicUserId, verified) {
  if (!mechanicUserId) return;
  await notifyUser(mechanicUserId.toString(), {
    title: verified ? 'Profile verified' : 'Verification updated',
    body: verified
      ? 'An administrator verified your mechanic profile. You can receive bookings.'
      : 'Your verification status was updated by an administrator.',
    type: 'mechanic_verification',
    link: '/dashboard',
    meta: { verified },
  });
}

async function onReviewCreated(mechanicUserId, rating, customerName) {
  if (!mechanicUserId) return;
  await notifyUser(mechanicUserId.toString(), {
    title: 'New review',
    body: `${customerName || 'A customer'} rated you ${rating}/5.`,
    type: 'review_new',
    link: '/mechanic/workspace/reviews',
    meta: { rating },
  });
}

module.exports = {
  notifyUser,
  notifyAllAdmins,
  onBookingCreated,
  onBookingStatusChange,
  onMechanicRegistered,
  onMechanicVerified,
  onReviewCreated,
};
