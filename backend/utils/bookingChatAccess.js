const Booking = require('../models/Booking');
const Mechanic = require('../models/Mechanic');

const BLOCKED_STATUSES = new Set(['rejected', 'cancelled']);

async function canUserAccessBookingChat(user, booking) {
  if (!user || !booking || BLOCKED_STATUSES.has(booking.status)) {
    return false;
  }
  if (user.user_type === 'customer') {
    return booking.customer_id && booking.customer_id.toString() === String(user.id);
  }
  if (user.user_type === 'mechanic') {
    const mechanic = await Mechanic.findByUserId(user.id);
    return (
      mechanic &&
      booking.mechanic_id &&
      mechanic._id.toString() === booking.mechanic_id.toString()
    );
  }
  return false;
}

async function getBookingForChat(bookingId) {
  if (!bookingId || !/^[0-9a-fA-F]{24}$/.test(String(bookingId))) {
    return null;
  }
  return await Booking.findById(bookingId);
}

module.exports = {
  canUserAccessBookingChat,
  getBookingForChat,
  BLOCKED_STATUSES,
};
