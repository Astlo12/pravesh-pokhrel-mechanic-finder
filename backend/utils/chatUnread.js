const Booking = require('../models/Booking');
const Mechanic = require('../models/Mechanic');
const ChatMessage = require('../models/ChatMessage');
const ChatReadState = require('../models/ChatReadState');
const { canUserAccessBookingChat } = require('./bookingChatAccess');

async function unreadSummaryForUser(user) {
  if (!user || !user.id) {
    return { total: 0, byBooking: {} };
  }

  let bookings = [];
  if (user.user_type === 'customer') {
    bookings = await Booking.findByCustomerId(user.id);
  } else if (user.user_type === 'mechanic') {
    const mechanic = await Mechanic.findByUserId(user.id);
    if (!mechanic) {
      return { total: 0, byBooking: {} };
    }
    bookings = await Booking.findByMechanicId(mechanic._id.toString());
  } else {
    return { total: 0, byBooking: {} };
  }

  const byBooking = {};
  let total = 0;

  for (const b of bookings) {
    const allowed = await canUserAccessBookingChat(user, b);
    if (!allowed) continue;
    const bid = b._id.toString();
    const lastRead = await ChatReadState.getLastRead(user.id, bid);
    const n = await ChatMessage.countUnreadAfter(bid, user.id, lastRead);
    if (n > 0) {
      byBooking[bid] = n;
      total += n;
    }
  }

  return { total, byBooking };
}

module.exports = { unreadSummaryForUser };
