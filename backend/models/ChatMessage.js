const { getCollection, ObjectId } = require('../config/database');

const MAX_BODY_LENGTH = 2000;

class ChatMessage {
  static collection() {
    return getCollection('booking_chat_messages');
  }

  static async create({ booking_id, sender_user_id, sender_role, body }) {
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) {
      throw new Error('Message body is required');
    }
    if (text.length > MAX_BODY_LENGTH) {
      throw new Error(`Message too long (max ${MAX_BODY_LENGTH} characters)`);
    }
    const collection = this.collection();
    const bookingOid = typeof booking_id === 'string' ? new ObjectId(booking_id) : booking_id;
    const senderOid = typeof sender_user_id === 'string' ? new ObjectId(sender_user_id) : sender_user_id;
    const doc = {
      booking_id: bookingOid,
      sender_user_id: senderOid,
      sender_role: sender_role === 'mechanic' ? 'mechanic' : 'customer',
      body: text,
      created_at: new Date(),
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async findByBookingId(bookingId, { limit = 200 } = {}) {
    const collection = this.collection();
    const objectId = typeof bookingId === 'string' ? new ObjectId(bookingId) : bookingId;
    const n = Math.min(Math.max(parseInt(String(limit), 10) || 200, 1), 500);
    return await collection
      .find({ booking_id: objectId })
      .sort({ created_at: 1 })
      .limit(n)
      .toArray();
  }

  /** Messages from the other party after lastRead (exclusive of own sends) */
  static async countUnreadAfter(bookingId, userId, lastRead) {
    const collection = this.collection();
    const boid = typeof bookingId === 'string' ? new ObjectId(bookingId) : bookingId;
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const after = lastRead instanceof Date && !Number.isNaN(lastRead.getTime()) ? lastRead : new Date(0);
    return await collection.countDocuments({
      booking_id: boid,
      sender_user_id: { $ne: uid },
      created_at: { $gt: after },
    });
  }
}

module.exports = ChatMessage;
