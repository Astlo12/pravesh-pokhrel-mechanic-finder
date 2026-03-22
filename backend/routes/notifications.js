const express = require('express');
const authenticate = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

function serialize(n) {
  if (!n) return null;
  return {
    id: n._id.toString(),
    title: n.title,
    body: n.body,
    type: n.type,
    link: n.link,
    meta: n.meta,
    read: !!n.read,
    read_at: n.read_at,
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}

// Unread count (define before /:id routes)
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.countUnread(req.user.id);
    res.json({ count });
  } catch (e) {
    console.error('Unread count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    const modified = await Notification.markAllRead(req.user.id);
    res.json({ message: 'All marked as read', modified });
  } catch (e) {
    console.error('Mark all read error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }
    const ok = await Notification.markRead(req.user.id, id);
    if (!ok) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Marked as read' });
  } catch (e) {
    console.error('Mark read error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit;
    const skip = req.query.skip;
    const unreadOnly = req.query.unread_only;
    const items = await Notification.findForUser(req.user.id, { limit, skip, unreadOnly });
    res.json({ notifications: items.map(serialize) });
  } catch (e) {
    console.error('List notifications error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
