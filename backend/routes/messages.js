const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const ChatReadState = require('../models/ChatReadState');
const authenticate = require('../middleware/auth');
const { canUserAccessBookingChat, getBookingForChat } = require('../utils/bookingChatAccess');
const { unreadSummaryForUser } = require('../utils/chatUnread');

const router = express.Router();

function serializeMessage(doc) {
  return {
    id: doc._id.toString(),
    booking_id: doc.booking_id.toString(),
    sender_user_id: doc.sender_user_id.toString(),
    sender_role: doc.sender_role,
    body: doc.body,
    created_at: doc.created_at,
  };
}

router.get('/unread-summary', authenticate, async (req, res) => {
  try {
    const summary = await unreadSummaryForUser(req.user);
    res.json(summary);
  } catch (error) {
    console.error('Chat unread summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/booking/:bookingId/read', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await getBookingForChat(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const allowed = await canUserAccessBookingChat(req.user, booking);
    if (!allowed) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    await ChatReadState.upsertRead(req.user.id, bookingId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark chat read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/booking/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await getBookingForChat(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const allowed = await canUserAccessBookingChat(req.user, booking);
    if (!allowed) {
      return res.status(403).json({ error: 'Not allowed to view messages for this booking' });
    }
    const rows = await ChatMessage.findByBookingId(bookingId, { limit: 200 });
    res.json(rows.map(serializeMessage));
  } catch (error) {
    console.error('List chat messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
