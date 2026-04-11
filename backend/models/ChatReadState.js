const { getCollection, ObjectId } = require('../config/database');

class ChatReadState {
  static collection() {
    return getCollection('booking_chat_read_state');
  }

  static async upsertRead(userId, bookingId) {
    const collection = this.collection();
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const bid = typeof bookingId === 'string' ? new ObjectId(bookingId) : bookingId;
    const now = new Date();
    await collection.updateOne(
      { user_id: uid, booking_id: bid },
      {
        $set: { last_read_at: now, updated_at: now },
        $setOnInsert: { user_id: uid, booking_id: bid, created_at: now },
      },
      { upsert: true }
    );
  }

  static async getLastRead(userId, bookingId) {
    const collection = this.collection();
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const bid = typeof bookingId === 'string' ? new ObjectId(bookingId) : bookingId;
    const doc = await collection.findOne({ user_id: uid, booking_id: bid });
    return doc && doc.last_read_at ? doc.last_read_at : null;
  }
}

module.exports = ChatReadState;
